import { describe, expect, it } from "vitest";

import { getOrdinal, isSameRanking } from "./utils";

describe("getOrdinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [10, "10th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [101, "101st"],
    [111, "111th"],
    [112, "112th"],
  ])("writes %i as %s", (n, ordinal) => {
    expect(getOrdinal(n)).toBe(ordinal);
  });
});

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
