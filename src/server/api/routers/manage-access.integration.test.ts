import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

import { cookieName } from "~/server/auth/manage-token";
import { DEVICE_ID_COOKIE } from "~/server/cookies";
import { testDb } from "~/test/integration/db";
import {
  awardPaths,
  createShow,
  procedureNames,
  type Show,
  showState,
  votedShow,
} from "~/test/integration/show";
import { expectError, type Visitor, visitor } from "~/test/integration/visitor";

/** Every route that changes a show, called on the show's normal category or the show itself */
const writeRoutes = {
  addCategory: (api, s) =>
    api.addCategory({
      sessionId: s.show.id,
      name: "Best Score",
      type: "NORMAL",
      sourceCategories: [],
    }),
  addNomination: (api, s) =>
    api.addNomination({ categoryId: s.normal.id, name: "Poor Things" }),
  setActiveCategory: (api, s) =>
    api.setActiveCategory({ categoryId: s.normal.id, active: true }),
  toggleRevealCategory: (api, s) =>
    api.toggleRevealCategory({ id: s.normal.id }),
  toggleHideVoteCounts: (api, s) =>
    api.toggleHideVoteCounts({ categoryId: s.normal.id }),
  toggleWinnerOnly: (api, s) =>
    api.toggleWinnerOnly({ categoryId: s.normal.id }),
  resetCategoryVotes: (api, s) =>
    api.resetCategoryVotes({ categoryId: s.normal.id }),
  resetAllVotes: (api, s) => api.resetAllVotes({ sessionId: s.show.id }),
  deleteNomination: (api, s) =>
    api.deleteNomination({ id: s.film("normal", "Dune").id }),
  deleteCategory: (api, s) => api.deleteCategory({ id: s.normal.id }),
  deleteSession: (api, s) => api.deleteSession({ id: s.show.id }),
} satisfies Record<
  string,
  (api: Visitor["api"], show: Show) => Promise<unknown>
>;

/** Visitors who must not manage someone else's show */
const outsiders = {
  "a visitor without a manage cookie": () => Promise.resolve(visitor()),
  "the host of another show": async () => {
    const otherHost = visitor();
    await createShow(otherHost, { password: "secret2" });
    return otherHost;
  },
};

it("covers every route that changes a show", () => {
  // Creating a show, entering its password and voting are open to everyone
  const open = ["createSession", "submitRanking", "verifyManageAccess", "vote"];
  expect(procedureNames("mutation")).toEqual(
    awardPaths([...open, ...Object.keys(writeRoutes)]),
  );
});

describe("a show with a password", () => {
  it.each(
    Object.entries(writeRoutes).flatMap(([route, call]) =>
      Object.entries(outsiders).map(
        ([who, outsider]) => [route, who, call, outsider] as const,
      ),
    ),
  )("%s rejects %s", async (_route, _who, call, outsider) => {
    const { show } = await votedShow({ password: "secret1" });
    const caller = await outsider();
    const before = await showState(show.show.id);

    await expectError(call(caller.api, show), "UNAUTHORIZED");
    expect(await showState(show.show.id)).toEqual(before);
  });

  it.each(Object.entries(writeRoutes))(
    "%s works for the host who created the show",
    async (_, call) => {
      const { host, show } = await votedShow({ password: "secret1" });

      await expect(call(host.api, show)).resolves.toBeDefined();
    },
  );

  it("rejects a manage cookie whose signature was changed", async () => {
    const host = visitor();
    const show = await createShow(host, { password: "secret1" });
    const cookie = cookieName(show.show.id);
    const token = host.cookies.get(cookie)!;
    // Change the last character but keep the length, so the signature comparison rejects it
    const forged = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    const stranger = visitor();
    stranger.cookies.set(cookie, forged);

    await expectError(
      writeRoutes.addCategory(stranger.api, show),
      "UNAUTHORIZED",
    );
  });

  it("gives access to a visitor who enters the password", async () => {
    const show = await createShow(visitor(), { password: "secret1" });
    const cohost = visitor();

    await cohost.api.verifyManageAccess({
      slug: show.show.slug,
      password: "secret1",
    });

    await expect(
      writeRoutes.addCategory(cohost.api, show),
    ).resolves.toBeDefined();
  });

  it.each([
    ["with a stray space", "secret1 ", "secret1"],
    // The same "é", as a letter plus a combining accent and as one character
    ["with accents typed another way", "café" + "1", "café" + "1"],
  ])("gives access for the password %s", async (_, entered, created) => {
    const show = await createShow(visitor(), { password: created });
    const cohost = visitor();

    await cohost.api.verifyManageAccess({
      slug: show.show.slug,
      password: entered,
    });

    await expect(
      writeRoutes.addCategory(cohost.api, show),
    ).resolves.toBeDefined();
  });

  it("still gives access to a show whose password was saved with spaces", async () => {
    // Shows created before BAR-49 could have a password with surrounding spaces
    const show = await createShow(visitor(), { password: "secret1" });
    await testDb.session.update({
      where: { id: show.show.id },
      data: { password: await bcrypt.hash(" secret1 ", 4) },
    });
    const cohost = visitor();

    await cohost.api.verifyManageAccess({
      slug: show.show.slug,
      password: " secret1 ",
    });

    await expect(
      writeRoutes.addCategory(cohost.api, show),
    ).resolves.toBeDefined();
  });

  it.each([
    ["only spaces", "    "],
    ["a leading space", " secret1"],
    ["over 72 bytes", "a".repeat(73)],
  ])("refuses to create a show with a password of %s", async (_, password) => {
    await expectError(
      visitor().api.createSession({
        name: "Movie Awards",
        slug: "movie-awards",
        password,
      }),
      "BAD_REQUEST",
    );
    expect(await testDb.session.count()).toBe(0);
  });

  it("gives no access for a wrong password", async () => {
    const show = await createShow(visitor(), { password: "secret1" });
    const stranger = visitor();

    await expectError(
      stranger.api.verifyManageAccess({
        slug: show.show.slug,
        password: "guess",
      }),
      "UNAUTHORIZED",
    );
    expect([...stranger.cookies.keys()]).toEqual([DEVICE_ID_COOKIE]);
  });
});

describe("a show without a password", () => {
  it.each(Object.entries(writeRoutes))(
    "%s works for anyone",
    async (_, call) => {
      const { show } = await votedShow();

      await expect(
        call(visitor({ deviceId: null }).api, show),
      ).resolves.toBeDefined();
    },
  );
});
