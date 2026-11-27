import { describe, expect, it } from "vitest";

import { findShowCode } from "~/server/shows";
import { testDb } from "~/test/integration/db";
import {
  awardPaths,
  createShow,
  FILMS,
  open,
  procedureNames,
  type Show,
  showState,
  votedShow,
} from "~/test/integration/show";
import { expectError, type Visitor, visitor } from "~/test/integration/visitor";

/** Every query, called on a show the way its pages do */
const queries = {
  getSession: (api, s) => api.getSession({ code: s.show.code }),
  getCategory: (api, s) => api.getCategory({ id: s.ranking.id }),
  getMyVotes: (api, s) => api.getMyVotes({ categoryId: s.ranking.id }),
  getPublicSessions: api => api.getPublicSessions(),
  findShow: (api, s) => api.findShow({ code: s.show.code }),
} satisfies Record<
  string,
  (api: Visitor["api"], show: Show) => Promise<unknown>
>;

describe("the password hash", () => {
  it("covers every query", () => {
    expect(procedureNames("query")).toEqual(awardPaths(Object.keys(queries)));
  });

  it("is never in a query's response, for the host, a voter or anyone else", async () => {
    const { host, voter, show } = await votedShow({ password: "secret1" });
    const { password: hash } = await testDb.session.findUniqueOrThrow({
      where: { id: show.show.id },
    });
    expect(hash).toMatch(/^\$2/);

    for (const [name, query] of Object.entries(queries)) {
      const responses = await Promise.all(
        [host, voter, visitor()].map(({ api }) => query(api, show)),
      );
      for (const response of responses.map(r => JSON.stringify(r))) {
        expect(response, name).not.toContain(hash);
        expect(response, name).not.toContain('"password"');
      }
    }
  });

  it("is never in the response of the routes that create a show or grant access", async () => {
    const created = await visitor().api.createSession({
      name: "Movie Awards",
      password: "secret1",
    });
    const access = await visitor().api.verifyManageAccess({
      code: created.code,
      password: "secret1",
    });

    for (const response of [created, access]) {
      expect(JSON.stringify(response)).not.toMatch(/password|\$2[aby]\$/);
    }
  });
});

describe("a room code", () => {
  const create = () =>
    visitor().api.createSession({ name: "Awards", password: "secret1" });

  it("is given to every new show: four characters from the alphabet, different for each, and no slug", async () => {
    const shows = await Promise.all(Array.from({ length: 20 }, create));
    for (const { code } of shows) {
      // Four characters, without 0/O, 1/I/L or U
      expect(code).toMatch(/^[2-9A-HJKMNP-TV-Z]{4}$/);
    }
    expect(new Set(shows.map(show => show.code)).size).toBe(shows.length);

    // Slugs are only for shows from before room codes
    const saved = await testDb.session.findMany({ select: { slug: true } });
    for (const { slug } of saved) expect(slug).toBeNull();
  });

  it("finds a show by the code typed on the homepage, ignoring case and spaces", async () => {
    const { api } = visitor();
    const { code } = await create();
    const spaced = `  ${code.slice(0, 2).toLowerCase()} ${code.slice(2)} `;

    for (const typed of [code, spaced]) {
      expect(await api.findShow({ code: typed }), typed).toEqual({ code });
    }
    await expectError(api.findShow({ code: "no-such-show" }), "NOT_FOUND");
    await expectError(api.findShow({ code: " " }), "BAD_REQUEST");
  });

  describe("in a page's URL", () => {
    /** A show from before room codes, with the slug it was created with */
    const oldShow = (slug: string) =>
      testDb.session.create({
        data: { name: "Old Awards", slug },
        select: { code: true },
      });

    it("finds the show by its code, also typed in lowercase", async () => {
      const { code } = await create();
      expect(await findShowCode(testDb, code)).toBe(code);
      expect(await findShowCode(testDb, code.toLowerCase())).toBe(code);
      expect(await findShowCode(testDb, "ZZZZZ")).toBeNull();
    });

    it("finds an older show by the slug in its old links", async () => {
      const { code } = await oldShow("movie-awards");
      expect(await findShowCode(testDb, "movie-awards")).toBe(code);
    });

    it("keeps an old link on its own show when its slug reads like another show's code", async () => {
      // Two shows from before room codes, the first given a code that reads like the second's
      // slug when codes were added (new codes avoid slugs)
      const { code } = await oldShow("first-show");
      const lookalike = await oldShow(code.toLowerCase());

      expect(await findShowCode(testDb, code.toLowerCase())).toBe(
        lookalike.code,
      );
      expect(await findShowCode(testDb, code)).toBe(code);
    });
  });
});

/** How many nominations with this name the category has */
const copies = (categoryId: string, name: string) =>
  testDb.nomination.count({ where: { categoryId, name } });

describe("an aggregate category", () => {
  const addAggregate = (show: Show, sourceCategories: string[]) =>
    show.addCategory({ name: "Overall", type: "AGGREGATE", sourceCategories });

  it("can't use another show's category, an aggregate, or a missing category as a source, and changes neither show", async () => {
    const [show, other] = await Promise.all([
      createShow(visitor()),
      createShow(visitor()),
    ]);
    const states = () =>
      Promise.all([showState(show.show.id), showState(other.show.id)]);
    const before = await states();

    await Promise.all(
      [
        [other.normal.id],
        [show.normal.id, other.ranking.id],
        [show.aggregate.id],
        [show.normal.id, "missing"],
      ].map(sources => expectError(addAggregate(show, sources), "BAD_REQUEST")),
    );

    expect(await states()).toEqual(before);
  });

  it("accepts the same source listed twice", async () => {
    const show = await createShow(visitor());

    const aggregate = await addAggregate(show, [
      show.normal.id,
      show.normal.id,
    ]);

    const nominations = await testDb.nomination.findMany({
      where: { categoryId: aggregate.id },
    });
    expect(nominations.map(n => n.name).sort()).toEqual([...FILMS].sort());
  });

  it("gets one copy of a nomination added to any of its sources", async () => {
    const host = visitor();
    const show = await createShow(host);

    await host.api.addNomination({
      categoryId: show.normal.id,
      name: "Poor Things",
    });
    await host.api.addNomination({
      categoryId: show.ranking.id,
      name: "Poor Things",
    });

    expect(await copies(show.aggregate.id, "Poor Things")).toBe(1);
  });
});

describe("a nomination with the same name as another in its category", () => {
  // Each show's normal category already has Dune, with no description
  const addDune = (show: Show, name: string, description?: string) =>
    show.addNomination({ categoryId: show.normal.id, name, description });

  it.each([
    ["the same name", "Dune", undefined],
    ["a different case and spaces", "  dune ", undefined],
    ["an empty description", "Dune", ""],
  ])(
    "is refused with %s and the same description",
    async (_, name, description) => {
      const show = await createShow(visitor());

      await expectError(addDune(show, name, description), "BAD_REQUEST");

      expect(await copies(show.normal.id, "Dune")).toBe(1);
    },
  );

  it("is refused with an exact repeat of a description too", async () => {
    const show = await createShow(visitor());
    await addDune(show, "Dune", "Part Two");

    await expectError(addDune(show, "Dune", " Part Two "), "BAD_REQUEST");
  });

  it("is copied into a new aggregate once, with the first one's description", async () => {
    const show = await createShow(visitor());
    await addDune(show, "Dune", "Part Two");

    const overall = await show.addCategory({
      name: "Overall 2",
      type: "AGGREGATE",
      sourceCategories: [show.normal.id],
    });

    expect(
      await testDb.nomination.findMany({
        where: { categoryId: overall.id, name: "Dune" },
        select: { description: true },
      }),
    ).toEqual([{ description: null }]);
  });

  it("can't be added to an aggregate, whose nominations come from its sources", async () => {
    const show = await createShow(visitor());

    await expectError(
      show.addNomination({
        categoryId: show.aggregate.id,
        name: "Poor Things",
      }),
      "BAD_REQUEST",
    );
  });

  it("is allowed with a different description, and the aggregate adds them together", async () => {
    const host = visitor();
    const show = await createShow(host);
    const second = await addDune(show, "Dune", "Part Two");
    await open(host, show.normal.id);
    await visitor().api.vote({ nominationId: show.film("normal", "Dune").id });
    await visitor().api.vote({ nominationId: second.id });

    const aggregate = await visitor().api.getCategory({
      id: show.aggregate.id,
    });

    expect(await copies(show.normal.id, "Dune")).toBe(2);
    expect(
      aggregate.nominations
        .filter(n => n.name === "Dune")
        .map(n => n._count.votes),
    ).toEqual([2]);
  });
});

describe("deleting", () => {
  it("a show removes its categories, nominations and votes, and leaves other shows alone", async () => {
    const { host, show } = await votedShow();
    const other = await votedShow();
    const otherBefore = await showState(other.show.show.id);
    expect((await showState(show.show.id)).votes).toHaveLength(3);

    await host.api.deleteSession({ id: show.show.id });

    expect(await showState(show.show.id)).toEqual({
      session: null,
      categories: [],
      nominations: [],
      votes: [],
    });
    expect(await showState(other.show.show.id)).toEqual(otherBefore);
  });

  it("a category removes its nominations and votes, and its place as an aggregate source", async () => {
    const { host, show } = await votedShow();

    await host.api.deleteCategory({ id: show.normal.id });

    const after = await showState(show.show.id);
    expect(after.categories.map(c => c.name).sort()).toEqual([
      "Overall",
      "Top Films",
    ]);
    expect(
      after.nominations.filter(n => n.categoryId === show.normal.id),
    ).toEqual([]);
    expect(after.votes.map(v => v.rank).sort()).toEqual([1, 2]);
    const aggregate = await testDb.category.findUniqueOrThrow({
      where: { id: show.aggregate.id },
      include: { sourceCategories: { select: { id: true } } },
    });
    expect(aggregate.sourceCategories).toEqual([{ id: show.ranking.id }]);
  });

  it("a nomination removes its votes", async () => {
    const { host, show } = await votedShow();

    await host.api.deleteNomination({ id: show.film("normal", "Dune").id });

    const after = await showState(show.show.id);
    expect(after.votes.map(v => v.rank).sort()).toEqual([1, 2]);
  });
});
