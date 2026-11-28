import { describe, expect, it } from "vitest";

import {
  ADDING,
  isAdding,
  moveInOrder,
  renameSource,
  updateCategory,
  updateNomination,
  withoutCategory,
  withoutNomination,
  withoutVotes,
} from "./show-changes";

const film = (id: string, score: number | null) => ({
  id,
  score,
  place: score ? 1 : null,
});
type Category = {
  id: string;
  nominations: ReturnType<typeof film>[];
  sourceCategories: { id: string }[];
  estimatedVoters: number | null;
};

const show = (): Category[] => [
  {
    id: "a",
    nominations: [film("a1", 3), film("a2", 1)],
    sourceCategories: [],
    estimatedVoters: 4,
  },
  {
    id: "b",
    nominations: [film("b1", 2)],
    sourceCategories: [],
    estimatedVoters: 2,
  },
  // An aggregate of both
  {
    id: "overall",
    nominations: [film("o1", 5)],
    sourceCategories: [{ id: "a" }, { id: "b" }],
    estimatedVoters: null,
  },
];

describe("updateCategory", () => {
  it("changes only that category", () => {
    const before = show();
    const after = updateCategory(before, "b", c => ({
      ...c,
      estimatedVoters: 9,
    }));

    expect(after.map(c => c.estimatedVoters)).toEqual([4, 9, null]);
    expect(after[0]).toBe(before[0]);
  });
});

describe("withoutVotes", () => {
  it("sets every score and the count of voters to 0, so no places", () => {
    const reset = withoutVotes(show()[0]!);

    expect(reset.nominations.map(({ score, place }) => [score, place])).toEqual(
      [
        [0, null],
        [0, null],
      ],
    );
    expect(reset.estimatedVoters).toBe(0);
  });

  it("keeps a hidden score hidden", () => {
    const hidden = { ...show()[0]!, nominations: [film("a1", null)] };
    expect(withoutVotes(hidden).nominations[0]?.score).toBeNull();
  });

  it("leaves an aggregate without a count of voters", () => {
    expect(withoutVotes(show()[2]!).estimatedVoters).toBeNull();
  });
});

describe("withoutCategory", () => {
  it("removes the category, and it from the aggregates that added it up", () => {
    const after = withoutCategory(show(), "a");

    expect(after.map(c => c.id)).toEqual(["b", "overall"]);
    expect(after[1]?.sourceCategories).toEqual([{ id: "b" }]);
  });
});

describe("withoutNomination", () => {
  it("removes the nomination from its category", () => {
    const after = withoutNomination(show(), "a1");

    expect(after[0]?.nominations.map(n => n.id)).toEqual(["a2"]);
    expect(after[1]?.nominations.map(n => n.id)).toEqual(["b1"]);
  });
});

describe("moveInOrder", () => {
  const ids = (categories: { id: string }[]) => categories.map(c => c.id);

  it.each([
    ["b", "up", ["b", "a", "overall"]],
    ["b", "down", ["a", "overall", "b"]],
    // At the ends it stays where it is
    ["a", "up", ["a", "b", "overall"]],
    ["overall", "down", ["a", "b", "overall"]],
    // A category that's gone changes nothing
    ["gone", "up", ["a", "b", "overall"]],
  ] as const)("moves %s %s", (id, direction, expected) => {
    expect(ids(moveInOrder(show(), id, direction))).toEqual(expected);
  });
});

describe("updateNomination", () => {
  it("changes only that nomination, wherever it is", () => {
    const after = updateNomination(show(), "b1", n => ({
      ...n,
      score: 7,
    }));

    expect(after.flatMap(c => c.nominations.map(n => n.score))).toEqual([
      3, 1, 7, 5,
    ]);
  });
});

describe("isAdding", () => {
  it("tells a nomination shown before the server has it from a saved one", () => {
    expect(isAdding({ id: `${ADDING}1` })).toBe(true);
    expect(isAdding({ id: "cmx1abc" })).toBe(false);
  });
});

describe("renameSource", () => {
  it("renames the category in the aggregates that add it up", () => {
    const categories = [
      { id: "a", sourceCategories: [] },
      {
        id: "overall",
        sourceCategories: [
          { id: "a", name: "Best Film" },
          { id: "b", name: "Best Poster" },
        ],
      },
    ];

    expect(renameSource(categories, "a", "Best Picture")[1]).toEqual({
      id: "overall",
      sourceCategories: [
        { id: "a", name: "Best Picture" },
        { id: "b", name: "Best Poster" },
      ],
    });
  });
});
