import { beforeEach, describe, expect, it } from "vitest";

import { testDb } from "~/test/integration/db";
import {
  createShow,
  open,
  reveal,
  scoresByName,
  type Show,
} from "~/test/integration/show";
import { expectError, type Visitor, visitor } from "~/test/integration/visitor";

let host: Visitor;
let voter: Visitor;
let show: Show;

beforeEach(async () => {
  host = visitor();
  voter = visitor();
  show = await createShow(host);
});

/** The voter's votes as `category:film` → rank (null for a normal vote) */
const votesOf = async (v: Visitor) =>
  Object.fromEntries(
    (
      await testDb.vote.findMany({
        where: { deviceId: v.deviceId! },
        include: { nomination: { select: { name: true, categoryId: true } } },
      })
    ).map(vote => [
      `${vote.nomination.categoryId === show.normal.id ? "normal" : "ranking"}:${vote.nomination.name}`,
      vote.rank,
    ]),
  );

const voteFor = (film: string, v = voter) =>
  v.api.vote({ nominationId: show.film("normal", film).id });

/** Submits a ranking of [category, film, rank] entries to the ranking category */
const submit = (entries: ["normal" | "ranking", string, number][]) =>
  voter.api.submitRanking({
    categoryId: show.ranking.id,
    rankings: entries.map(([category, film, rank]) => ({
      nominationId: show.film(category, film).id,
      rank,
    })),
  });

/** Ranks films from the ranking category in this order */
const rank = (...films: string[]) =>
  submit(films.map((film, i) => ["ranking", film, i + 1]));

describe("voting in a normal category", () => {
  it("saves the vote while the category is open", async () => {
    await open(host, show.normal.id);

    await voteFor("Dune");

    expect(await votesOf(voter)).toEqual({ "normal:Dune": null });
    expect(await voter.api.getMyVotes({ categoryId: show.normal.id })).toEqual([
      { nominationId: show.film("normal", "Dune").id, rank: null },
    ]);
  });

  it("replaces the voter's previous vote", async () => {
    await open(host, show.normal.id);

    await voteFor("Dune");
    await voteFor("Barbie");

    expect(await votesOf(voter)).toEqual({ "normal:Barbie": null });
  });

  it("keeps each device's vote separate", async () => {
    await open(host, show.normal.id);
    const other = visitor();

    await voteFor("Dune");
    await voteFor("Barbie", other);

    expect(await votesOf(voter)).toEqual({ "normal:Dune": null });
    expect(await votesOf(other)).toEqual({ "normal:Barbie": null });
  });

  it("rejects a vote before the category opens", async () => {
    await expectError(voteFor("Dune"), "BAD_REQUEST");
    expect(await votesOf(voter)).toEqual({});
  });

  it("rejects a vote after the host opens another category", async () => {
    await open(host, show.normal.id);
    await open(host, show.ranking.id);

    await expectError(voteFor("Dune"), "BAD_REQUEST");
    expect(await votesOf(voter)).toEqual({});
  });

  it("rejects a vote without a device cookie", async () => {
    await open(host, show.normal.id);

    await expectError(
      voteFor("Dune", visitor({ deviceId: null })),
      "UNAUTHORIZED",
    );
    expect(await testDb.vote.count()).toBe(0);
  });

  it("rejects a vote for a nomination that doesn't exist", async () => {
    await expectError(voter.api.vote({ nominationId: "missing" }), "NOT_FOUND");
  });
});

describe("voting in other categories", () => {
  it("rejects votes in an aggregate category, even while it's open", async () => {
    await open(host, show.aggregate.id);
    const nomination = await testDb.nomination.findFirstOrThrow({
      where: { categoryId: show.aggregate.id },
    });

    await expectError(
      voter.api.vote({ nominationId: nomination.id }),
      "BAD_REQUEST",
    );
    expect(await testDb.vote.count()).toBe(0);
  });

  it("rejects a single vote in a ranking category", async () => {
    await open(host, show.ranking.id);

    await expectError(
      voter.api.vote({ nominationId: show.film("ranking", "Dune").id }),
      "BAD_REQUEST",
    );
    expect(await testDb.vote.count()).toBe(0);
  });
});

describe("ranking", () => {
  it("saves a valid ranking while the category is open", async () => {
    await open(host, show.ranking.id);

    await rank("Dune", "Barbie");

    expect(await votesOf(voter)).toEqual({
      "ranking:Dune": 1,
      "ranking:Barbie": 2,
    });
  });

  it("gives the voter only their own ranking, best first", async () => {
    await open(host, show.ranking.id);

    await submit([
      ["ranking", "Barbie", 2],
      ["ranking", "Dune", 1],
    ]);

    expect(await voter.api.getMyVotes({ categoryId: show.ranking.id })).toEqual(
      [
        { nominationId: show.film("ranking", "Dune").id, rank: 1 },
        { nominationId: show.film("ranking", "Barbie").id, rank: 2 },
      ],
    );
    for (const other of [visitor(), visitor({ deviceId: null })]) {
      expect(
        await other.api.getMyVotes({ categoryId: show.ranking.id }),
      ).toEqual([]);
    }
    expect(await voter.api.getMyVotes({ categoryId: show.normal.id })).toEqual(
      [],
    );
  });

  it("replaces the voter's whole previous ranking", async () => {
    await open(host, show.ranking.id);

    await rank("Dune", "Barbie");
    await rank("Oppenheimer", "Dune");

    expect(await votesOf(voter)).toEqual({
      "ranking:Oppenheimer": 1,
      "ranking:Dune": 2,
    });
  });

  it("rejects a ranking before the category opens", async () => {
    await expectError(rank("Dune", "Barbie"), "BAD_REQUEST");
    expect(await votesOf(voter)).toEqual({});
  });

  it("rejects a ranking in a category that isn't a ranking category", async () => {
    await open(host, show.normal.id);

    await expectError(
      voter.api.submitRanking({
        categoryId: show.normal.id,
        rankings: [{ nominationId: show.film("normal", "Dune").id, rank: 1 }],
      }),
      "BAD_REQUEST",
    );
  });

  it.each([
    ["too few nominations", () => rank("Dune")],
    ["too many nominations", () => rank("Dune", "Barbie", "Oppenheimer")],
    ["the same nomination twice", () => rank("Dune", "Dune")],
    [
      "a repeated rank",
      () =>
        submit([
          ["ranking", "Dune", 1],
          ["ranking", "Barbie", 1],
        ]),
    ],
    [
      "a rank outside 1 to rankingTop",
      () =>
        submit([
          ["ranking", "Dune", 1],
          ["ranking", "Barbie", 3],
        ]),
    ],
    [
      "a nomination from another category",
      () =>
        submit([
          ["ranking", "Dune", 1],
          ["normal", "Barbie", 2],
        ]),
    ],
  ])("rejects a ranking with %s", async (_, submitRanking) => {
    await open(host, show.ranking.id);

    await expectError(submitRanking(), "BAD_REQUEST");
    expect(await votesOf(voter)).toEqual({});
  });

  it("keeps a previous ranking when a new one is rejected", async () => {
    await open(host, show.ranking.id);
    await rank("Dune", "Barbie");

    await expectError(rank("Dune"), "BAD_REQUEST");

    expect(await votesOf(voter)).toEqual({
      "ranking:Dune": 1,
      "ranking:Barbie": 2,
    });
  });
});

describe("after the host reveals the category", () => {
  const closed = { message: "Voting has closed for this category" };

  it("rejects a new or changed vote and keeps the voter's vote", async () => {
    await open(host, show.normal.id);
    await voteFor("Dune");
    await reveal(host, show.normal.id);

    await expect(voteFor("Barbie")).rejects.toMatchObject(closed);
    await expect(voteFor("Barbie", visitor())).rejects.toMatchObject(closed);

    expect(await votesOf(voter)).toEqual({ "normal:Dune": null });
    expect(await testDb.vote.count()).toBe(1);
  });

  it("rejects a new ranking and keeps the voter's ranking", async () => {
    await open(host, show.ranking.id);
    await rank("Dune", "Barbie");
    await reveal(host, show.ranking.id);

    await expect(rank("Oppenheimer", "Dune")).rejects.toMatchObject(closed);

    expect(await votesOf(voter)).toEqual({
      "ranking:Dune": 1,
      "ranking:Barbie": 2,
    });
  });

  it("stays closed when the host reveals again from an out-of-date page", async () => {
    await open(host, show.normal.id);
    await reveal(host, show.normal.id);
    await reveal(host, show.normal.id);

    await expect(voteFor("Barbie")).rejects.toMatchObject(closed);
  });

  it("accepts votes and rankings again once the results are hidden", async () => {
    await open(host, show.normal.id);
    await reveal(host, show.normal.id);
    await reveal(host, show.normal.id, false);
    await voteFor("Barbie");
    await open(host, show.ranking.id);
    await reveal(host, show.ranking.id);
    await reveal(host, show.ranking.id, false);
    await rank("Oppenheimer", "Dune");

    expect(await votesOf(voter)).toEqual({
      "normal:Barbie": null,
      "ranking:Oppenheimer": 1,
      "ranking:Dune": 2,
    });
  });
});

describe("scores", () => {
  it("count votes, ranking points and aggregate totals from the database", async () => {
    await open(host, show.normal.id);
    await voteFor("Dune");
    await voteFor("Dune", visitor());
    await open(host, show.ranking.id);
    await rank("Barbie", "Dune");

    const { categories } = await visitor().api.getSession({
      code: show.show.code,
    });
    const scores = Object.fromEntries(
      categories.map(c => [c.name, scoresByName(c.nominations)]),
    );

    expect(scores).toEqual({
      "Best Film": { Dune: 2, Barbie: 0, Oppenheimer: 0 },
      // Top 2: 1st = 2 points, 2nd = 1 point
      "Top Films": { Dune: 1, Barbie: 2, Oppenheimer: 0 },
      Overall: { Dune: 3, Barbie: 2, Oppenheimer: 0 },
    });
  });

  it("are the same for an aggregate loaded on its own", async () => {
    await open(host, show.normal.id);
    await voteFor("Dune");
    await open(host, show.ranking.id);
    await rank("Barbie", "Dune");
    const expected = { Dune: 2, Barbie: 2, Oppenheimer: 0 };

    const category = await visitor().api.getCategory({ id: show.aggregate.id });
    await open(host, show.aggregate.id);
    const { categories } = await visitor().api.getSession({
      code: show.show.code,
      activeOnly: true,
    });

    expect(scoresByName(category.nominations)).toEqual(expected);
    expect(categories.map(c => scoresByName(c.nominations))).toEqual([
      expected,
    ]);
  });

  it("take a fixed number of database operations, however many aggregates there are", async () => {
    let operations = 0;
    const counting = testDb.$extends({
      query: {
        $allOperations: ({ args, query }) => {
          operations++;
          return query(args);
        },
      },
    }) as unknown as typeof testDb;
    const countOperations = async (
      call: (api: Visitor["api"]) => Promise<unknown>,
    ) => {
      operations = 0;
      await call(visitor({ db: counting }).api);
      return operations;
    };
    for (const name of ["Overall 2", "Overall 3"]) {
      await show.addCategory({
        name,
        type: "AGGREGATE",
        sourceCategories: [show.normal.id, show.ranking.id],
      });
    }
    await open(host, show.aggregate.id);

    // The show with its categories, and its password to check access (in parallel);
    // aggregates are scored from sources loaded with the show
    expect(
      await countOperations(api => api.getSession({ code: show.show.code })),
    ).toBe(2);
    // Only the active aggregate is loaded, so its sources' nominations take one more
    expect(
      await countOperations(api =>
        api.getSession({ code: show.show.code, activeOnly: true }),
      ),
    ).toBe(3);
    expect(
      await countOperations(api => api.getCategory({ id: show.aggregate.id })),
    ).toBe(2);
  });
});
