import { describe, expect, it } from "vitest";

import {
  columnColours,
  MIN_HEIGHT,
  podium,
  podiumSlots,
  riseOrder,
  seededOrder,
} from "./podium";

const nomination = (
  id: string,
  score: number | null,
  place: number | null,
) => ({
  id,
  score,
  place,
});

/** Nominations with these scores, all shown, with their places as the server gives them */
const scored = (...scores: number[]) => {
  const distinct = [...new Set(scores.filter(s => s > 0))].sort(
    (a, b) => b - a,
  );
  return scores.map((score, i) =>
    nomination(`n${i}`, score, score > 0 ? distinct.indexOf(score) + 1 : null),
  );
};

const ids = (list: { id: string }[]) => list.map(n => n.id);

describe("seededOrder", () => {
  it("shuffles every number once, the same way for the same seed", () => {
    const order = seededOrder("category-1", 7);
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(seededOrder("category-1", 7)).toEqual(order);
  });

  it("differs between seeds", () => {
    const orders = new Set(
      ["a", "b", "c", "d", "e"].map(seed => seededOrder(seed, 7).join()),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("columnColours", () => {
  const allIds = (n: number) => Array.from({ length: n }, (_, i) => `n${i}`);

  it("gives a nomination the same colour whichever others are shown", () => {
    const every = allIds(5);
    const all = columnColours("cat", every, new Set(every));
    const some = columnColours("cat", every, new Set(["n1", "n3"]));
    expect(some.get("n1")).toBe(all.get("n1"));
    expect(some.get("n3")).toBe(all.get("n3"));
    expect([...some.keys()]).toEqual(["n1", "n3"]);
  });

  it("never gives two columns the same colour, past seven nominations too", () => {
    const every = allIds(12);
    // The 1st and 8th nomination would share a colour by their order alone
    const shown = new Set(["n0", "n7", "n8", "n1", "n11"]);
    const colours = [...columnColours("cat", every, shown).values()];
    expect(new Set(colours).size).toBe(colours.length);
    for (const colour of colours) {
      expect(colour).toBeGreaterThanOrEqual(1);
      expect(colour).toBeLessThanOrEqual(7);
    }
  });
});

describe("podiumSlots", () => {
  it("puts the winner in the middle, 2nd and 3rd to its left, the rest to its right", () => {
    expect(podiumSlots(5)).toEqual([2, 1, 0, 3, 4]);
    expect(podiumSlots(3)).toEqual([1, 0, 2]);
    expect(podiumSlots(2)).toEqual([1, 0]);
    expect(podiumSlots(1)).toEqual([0]);
    expect(podiumSlots(0)).toEqual([]);
  });
});

describe("podium", () => {
  it("stands the nominations best first, the winner tallest and in the middle", () => {
    const { columns, winners, rest } = podium(scored(7, 14, 2, 12, 4), {
      winnerOnly: false,
    });
    expect(ids(columns)).toEqual(["n1", "n3", "n0", "n4", "n2"]);
    expect(ids(winners)).toEqual(["n1"]);
    expect(rest).toEqual([]);
    expect(columns[0]).toMatchObject({ winner: true, height: 1, slot: 2 });
    expect(columns[1]!.height).toBeCloseTo(12 / 14);
    // 3rd, 2nd, 1st, 4th, 5th from left to right
    expect(columns.map(c => c.slot)).toEqual([2, 1, 0, 3, 4]);
  });

  it("crowns every winner of a tie, side by side", () => {
    const { columns, winners } = podium(scored(5, 2, 5), { winnerOnly: false });
    expect(ids(winners)).toEqual(["n0", "n2"]);
    expect(columns.filter(c => c.winner).map(c => c.slot)).toEqual([1, 0]);
  });

  it("keeps a column for a nomination without votes, at the shortest height", () => {
    const { columns } = podium(scored(3, 0), { winnerOnly: false });
    expect(columns[1]).toMatchObject({
      id: "n1",
      height: MIN_HEIGHT,
      winner: false,
    });
  });

  it("has no winner when nobody voted", () => {
    const { columns, winners } = podium(scored(0, 0), { winnerOnly: false });
    expect(winners).toEqual([]);
    expect(columns.every(c => c.height === MIN_HEIGHT && !c.winner)).toBe(true);
  });

  it("stands only the winners with winner only", () => {
    // The server hides everyone else's score and place
    const nominations = [
      nomination("a", null, null),
      nomination("b", 9, 1),
      nomination("c", null, null),
    ];
    const { columns, rest } = podium(nominations, { winnerOnly: true });
    expect(ids(columns)).toEqual(["b"]);
    expect(rest).toEqual([]);
  });

  it("steps the columns down by place when the counts are hidden", () => {
    const nominations = [
      nomination("a", null, 2),
      nomination("b", null, 1),
      nomination("c", null, null),
    ];
    const { columns } = podium(nominations, { winnerOnly: false });
    expect(ids(columns)).toEqual(["b", "a", "c"]);
    expect(columns[0]!.height).toBe(1);
    expect(columns[1]!.height).toBeLessThan(1);
    expect(columns[2]!.height).toBe(MIN_HEIGHT);
  });

  it("gives seven nominations a column each, and past seven the top five and the rest", () => {
    expect(
      podium(scored(7, 6, 5, 4, 3, 2, 1), { winnerOnly: false }).columns,
    ).toHaveLength(7);

    const { columns, rest } = podium(scored(9, 8, 7, 6, 5, 4, 3, 2), {
      winnerOnly: false,
    });
    expect(ids(columns)).toEqual(["n0", "n1", "n2", "n3", "n4"]);
    expect(ids(rest)).toEqual(["n5", "n6", "n7"]);
  });

  it("never puts a winner in the rest, even past seven of them", () => {
    const { columns, rest } = podium(scored(4, 4, 4, 4, 4, 4, 4, 4, 1), {
      winnerOnly: false,
    });
    expect(columns).toHaveLength(8);
    expect(columns.every(c => c.winner)).toBe(true);
    expect(ids(rest)).toEqual(["n8"]);
  });

  it("keeps every tied winner on the podium past seven nominations", () => {
    const { columns } = podium(scored(5, 5, 5, 5, 5, 5, 1, 1), {
      winnerOnly: false,
    });
    expect(columns).toHaveLength(6);
    expect(columns.every(c => c.winner)).toBe(true);
  });
});

describe("riseOrder", () => {
  it("raises the runners-up from the shortest, then the winners together", () => {
    const { columns } = podium(scored(4, 9, 9, 6), { winnerOnly: false });
    expect(ids(riseOrder(columns))).toEqual(["n0", "n3", "n1", "n2"]);
  });
});
