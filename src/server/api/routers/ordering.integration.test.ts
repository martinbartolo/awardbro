import { describe, expect, it } from "vitest";

import { testDb } from "~/test/integration/db";
import { createShow } from "~/test/integration/show";
import { visitor } from "~/test/integration/visitor";

/** The show's category names in running order, as the manage and present pages list them */
const runningOrder = async (show: { show: { code: string } }) =>
  (await visitor().api.getSession({ code: show.show.code })).categories.map(
    c => c.name,
  );

/** A show with categories A, B, C and D, added in that order */
async function lettersShow() {
  const host = visitor();
  const session = await host.api.createSession({
    name: "Letters",
    password: "secret1",
  });
  const ids: Record<string, string> = {};
  for (const name of ["A", "B", "C", "D"]) {
    const category = await host.api.addCategory({
      sessionId: session.id,
      name,
      type: "NORMAL",
      sourceCategories: [],
    });
    ids[name] = category.id;
  }
  const add = (name: string) =>
    host.api.addCategory({
      sessionId: session.id,
      name,
      type: "NORMAL",
      sourceCategories: [],
    });
  const move = (name: string, direction: "up" | "down") =>
    host.api.moveCategory({ id: ids[name]!, direction });
  const addAggregate = (sourceCategories: string[]) =>
    host.api.addCategory({
      sessionId: session.id,
      name: "Overall",
      type: "AGGREGATE",
      sourceCategories,
    });
  return { show: { show: session }, ids, add, addAggregate, move };
}

describe("the running order", () => {
  it("puts a new category at the end", async () => {
    const { show, add } = await lettersShow();

    await add("E");

    expect(await runningOrder(show)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("gives categories added at the same moment their own places", async () => {
    const { show, add } = await lettersShow();

    await Promise.all(["E", "F", "G"].map(add));

    const positions = await testDb.category.findMany({
      where: { sessionId: show.show.id },
      select: { position: true },
    });
    expect(new Set(positions.map(p => p.position)).size).toBe(7);
  });

  it("moves a category up and down one place", async () => {
    const { show, move } = await lettersShow();

    await move("C", "up");
    expect(await runningOrder(show)).toEqual(["A", "C", "B", "D"]);

    await move("A", "down");
    expect(await runningOrder(show)).toEqual(["C", "A", "B", "D"]);
  });

  it("leaves the first category where it is when moved up, and the last when moved down", async () => {
    const { show, move } = await lettersShow();

    await move("A", "up");
    await move("D", "down");

    expect(await runningOrder(show)).toEqual(["A", "B", "C", "D"]);
  });

  it("lists aggregate sources in the running order", async () => {
    const { show, move } = await lettersShow();
    await move("D", "up");

    const sources = await visitor().api.getSessionCategories({
      sessionId: show.show.id,
    });

    expect(sources.map(c => c.name)).toEqual(["A", "B", "D", "C"]);
  });

  it("lists an aggregate's sources in the running order", async () => {
    const { ids, addAggregate, move } = await lettersShow();
    const overall = await addAggregate([ids.D!, ids.A!, ids.C!]);
    await move("D", "up");

    const aggregate = await visitor().api.getCategory({ id: overall.id });

    expect(aggregate.sourceCategories.map(c => c.name)).toEqual([
      "A",
      "D",
      "C",
    ]);
  });

  it("settles a tie on the next move", async () => {
    const { show, move } = await lettersShow();
    // Code from before positions (after a rollback) adds categories with the default, 0
    await testDb.category.updateMany({
      where: { sessionId: show.show.id, name: "D" },
      data: { position: 0 },
    });

    await move("B", "down");

    const positions = await testDb.category.findMany({
      where: { sessionId: show.show.id },
      orderBy: { position: "asc" },
      select: { name: true, position: true },
    });
    expect(positions.map(p => p.position)).toEqual([0, 1, 2, 3]);
    expect(await runningOrder(show)).toEqual(["A", "D", "C", "B"]);
  });

  it("doesn't move another show's categories", async () => {
    const { move } = await lettersShow();
    const other = await createShow(visitor());
    const before = await runningOrder(other);

    await move("B", "up");

    expect(await runningOrder(other)).toEqual(before);
  });
});
