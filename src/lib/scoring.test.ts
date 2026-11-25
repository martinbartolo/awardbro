import { describe, expect, it } from "vitest";

import { estimateVoters, getScoreLabel, scoreNomination } from "./scoring";

const normal = { type: "NORMAL", rankingTop: null } as const;
const image = { type: "IMAGE", rankingTop: null } as const;
const topThree = { type: "RANKING", rankingTop: 3 } as const;
const topFive = { type: "RANKING", rankingTop: 5 } as const;
const aggregate = { type: "AGGREGATE", rankingTop: null } as const;

/** A nomination with one vote per rank given (null for a vote without a rank) */
const voted = (name: string, ...ranks: (number | null)[]) => ({
  name,
  _count: { votes: ranks.length },
  votes: ranks.map(rank => ({ rank })),
});
const dune = (...ranks: (number | null)[]) => voted("Dune", ...ranks);

describe("scoreNomination in normal and image categories", () => {
  it.each([
    ["normal", normal],
    ["image", image],
  ])("counts 1 point per vote in %s categories", (_, category) => {
    expect(scoreNomination(category, dune(null, null, null))).toBe(3);
    expect(scoreNomination(category, dune())).toBe(0);
  });

  it("uses the vote count, without needing the votes", () => {
    expect(
      scoreNomination(normal, {
        name: "Dune",
        _count: { votes: 4 },
        votes: [],
      }),
    ).toBe(4);
  });
});

describe("scoreNomination in ranking categories", () => {
  it("gives rankingTop points for 1st place, down to 1 point for last", () => {
    expect(
      [1, 2, 3].map(rank => scoreNomination(topThree, dune(rank))),
    ).toEqual([3, 2, 1]);
  });

  it("adds up the points of every vote", () => {
    // 1st (3) + 1st (3) + 2nd (2) + 3rd (1)
    expect(scoreNomination(topThree, dune(1, 1, 2, 3))).toBe(9);
  });

  it("gives nothing for votes without a rank", () => {
    expect(scoreNomination(topThree, dune(1, null))).toBe(3);
  });

  it("scores ranks outside the range as the formula gives", () => {
    // Saving a vote rejects these, so they only matter for old data
    expect(scoreNomination(topThree, dune(4))).toBe(0);
    expect(scoreNomination(topThree, dune(5))).toBe(-1);
  });

  it("counts 1 point per vote when rankingTop is missing", () => {
    const category = { type: "RANKING", rankingTop: null } as const;
    expect(scoreNomination(category, dune(1, 2))).toBe(2);
  });
});

describe("scoreNomination in aggregate categories", () => {
  const sources = [
    { ...voted("Dune", null, null), category: normal }, // 2
    { ...voted("Dune", 1, 3), category: topThree }, // 3 + 1
    { ...voted("Dune", 2), category: topFive }, // 4
    { ...voted("Barbie", null), category: normal }, // 1
    { ...voted("Barbie", 1, 1), category: topFive }, // 10
    { ...voted("Oppenheimer", 2), category: topThree }, // 2
  ];
  const score = (name: string) =>
    scoreNomination(aggregate, voted(name), sources);

  it("adds the scores of the source nominations with the same name", () => {
    expect(score("Dune")).toBe(10);
    expect(score("Barbie")).toBe(11);
  });

  it("scores a name found in only some sources by those sources", () => {
    expect(score("Oppenheimer")).toBe(2);
  });

  it("scores a name found in no source as 0", () => {
    expect(score("Poor Things")).toBe(0);
    expect(scoreNomination(aggregate, dune())).toBe(0);
  });

  it("matches names exactly", () => {
    expect(score("dune")).toBe(0);
  });
});

describe("estimateVoters", () => {
  const scores = (...votes: number[]) =>
    votes.map(v => ({ _count: { votes: v } }));

  it("adds up the votes in other categories", () => {
    expect(estimateVoters(normal, scores(3, 0, 2))).toBe(5);
    expect(estimateVoters(aggregate, scores(4, 1))).toBe(5);
  });

  it.each([
    // [rankingTop, points per ballot]
    [2, 3],
    [3, 6],
    [10, 55],
  ])(
    "divides the points by the %i + … + 1 = %i a ballot hands out",
    (rankingTop, perBallot) => {
      const category = { type: "RANKING", rankingTop } as const;
      expect(estimateVoters(category, scores(perBallot * 4))).toBe(4);
    },
  );

  it("rounds to the nearest whole voter", () => {
    // 2 full top-3 ballots (12 points) plus 1 point
    expect(estimateVoters(topThree, scores(10, 3))).toBe(2);
  });

  it("counts nothing for a category without nominations", () => {
    expect(estimateVoters(topThree, [])).toBe(0);
  });
});

describe("getScoreLabel", () => {
  it.each([
    ["NORMAL", 1, "vote"],
    ["NORMAL", 0, "votes"],
    ["IMAGE", 2, "votes"],
    ["RANKING", 1, "point"],
    ["RANKING", 12, "points"],
  ] as const)("labels %s with %i as %s", (type, count, label) => {
    expect(
      getScoreLabel({ type, rankingTop: 3, sourceCategories: [] }, count),
    ).toBe(label);
  });

  // Matches scoreNomination, which counts plain votes for a ranking category without a top N
  it("labels a ranking category without a top N as votes", () => {
    expect(
      getScoreLabel(
        { type: "RANKING", rankingTop: null, sourceCategories: [] },
        2,
      ),
    ).toBe("votes");
  });

  it.each([
    ["only normal and image sources", ["NORMAL", "IMAGE"], 5, "votes"],
    ["a ranking source", ["NORMAL", "RANKING"], 3, "points"],
    ["a ranking source, with 1", ["RANKING"], 1, "point"],
  ] as const)("labels an aggregate with %s", (_, sources, count, label) => {
    const sourceCategories = sources.map(type => ({ type, rankingTop: 3 }));
    expect(
      getScoreLabel(
        { type: "AGGREGATE", rankingTop: null, sourceCategories },
        count,
      ),
    ).toBe(label);
  });
});
