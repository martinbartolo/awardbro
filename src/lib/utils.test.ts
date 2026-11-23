import { describe, expect, it } from "vitest";

import { isSameRanking } from "./utils";

const ranking = [
  { nominationId: "a", rank: 1 },
  { nominationId: "b", rank: 2 },
];

describe("isSameRanking", () => {
  it("matches the same ranking in any order", () => {
    expect(isSameRanking(ranking, [...ranking].reverse())).toBe(true);
  });

  it("rejects different ranks for the same nominations", () => {
    expect(
      isSameRanking(ranking, [
        { nominationId: "a", rank: 2 },
        { nominationId: "b", rank: 1 },
      ]),
    ).toBe(false);
  });

  it("rejects rankings of different lengths", () => {
    expect(isSameRanking(ranking, ranking.slice(0, 1))).toBe(false);
    expect(isSameRanking([], ranking)).toBe(false);
  });
});
