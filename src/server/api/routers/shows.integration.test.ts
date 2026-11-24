import { describe, expect, it } from "vitest";

import { testDb } from "~/test/integration/db";
import {
  awardPaths,
  procedureNames,
  type Show,
  showState,
  votedShow,
} from "~/test/integration/show";
import { type Visitor, visitor } from "~/test/integration/visitor";

/** Every query, called on a show the way its pages do */
const queries = {
  getSessionBySlug: (api, s) => api.getSessionBySlug({ slug: s.show.slug }),
  getSessionCategories: (api, s) =>
    api.getSessionCategories({ sessionId: s.show.id }),
  getCategory: (api, s) => api.getCategory({ id: s.ranking.id }),
  getCurrentRankings: (api, s) =>
    api.getCurrentRankings({ categoryId: s.ranking.id }),
  getCurrentVote: (api, s) => api.getCurrentVote({ categoryId: s.normal.id }),
  hasVoted: (api, s) => api.hasVoted({ categoryId: s.normal.id }),
  getPublicSessions: api => api.getPublicSessions(),
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
      slug: "movie-awards",
      password: "secret1",
    });
    const access = await visitor().api.verifyManageAccess({
      slug: "movie-awards",
      password: "secret1",
    });

    for (const response of [created, access]) {
      expect(JSON.stringify(response)).not.toMatch(/password|\$2[aby]\$/);
    }
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
