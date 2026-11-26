import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "~/generated/prisma/client";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const { db, tx } = vi.hoisted(() => ({
  db: {
    // An open show (no password), so assertCanManage lets the call through
    session: { findFirst: vi.fn(), delete: vi.fn() },
    category: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    nomination: { findUnique: vi.fn(), delete: vi.fn() },
    vote: { deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  // The client passed to interactive transactions (saveVote)
  tx: {
    $queryRaw: vi.fn(),
    nomination: { count: vi.fn() },
    vote: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      createManyAndReturn: vi.fn(),
    },
  },
}));
vi.mock("~/server/db", () => ({ db }));

const caller = createCaller(() =>
  createTRPCContext({
    headers: new Headers({ cookie: "device_id=device-1" }),
    resHeaders: new Headers(),
  }),
);

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Prisma error", {
    code,
    clientVersion: "test",
  });

/** The category as seen inside saveVote's transaction */
let lockedCategory = { isActive: true, revealed: false };

beforeEach(() => {
  vi.clearAllMocks();
  lockedCategory = { isActive: true, revealed: false };
  db.session.findFirst.mockResolvedValue({ id: "show", password: null });
  // Stand-ins for the queries, so the tests can see what was batched
  db.$queryRaw.mockReturnValue("lock-show");
  db.category.updateMany.mockReturnValue("deactivate-all");
  db.category.update.mockReturnValue("update-one");
  db.category.delete.mockReturnValue("delete-category");
  db.nomination.delete.mockReturnValue("delete-nomination");
  db.session.delete.mockReturnValue("delete-show");
  db.vote.deleteMany.mockReturnValue("delete-votes");
  // A batch returns its queries; an interactive transaction runs with `tx`
  db.$transaction.mockImplementation(
    (arg: unknown[] | ((client: typeof tx) => unknown)) =>
      typeof arg === "function" ? arg(tx) : Promise.resolve(arg),
  );
  // The show lock returns nothing; the device lock query returns the category
  tx.$queryRaw.mockImplementation((sql: TemplateStringsArray) =>
    Promise.resolve(
      sql.join("").includes('"isActive"') ? [lockedCategory] : [],
    ),
  );
  tx.nomination.count.mockImplementation(
    ({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(where.id.in.length),
  );
  tx.vote.create.mockResolvedValue("new-vote");
  tx.vote.createManyAndReturn.mockResolvedValue("new-ranking");
});

const VOTING_CLOSED = { message: "Voting has closed for this category" };

const callOrder = (...fns: { mock: { invocationCallOrder: number[] } }[]) =>
  fns.map(fn => fn.mock.invocationCallOrder[0]);

describe("vote", () => {
  /** The nomination's category, as `vote` loads it before the transaction */
  const loadCategory = (state: { isActive?: boolean; revealed?: boolean }) =>
    db.nomination.findUnique.mockResolvedValue({
      categoryId: "cat",
      category: {
        type: "NORMAL",
        isActive: true,
        revealed: false,
        sessionId: "show",
        ...state,
      },
    });

  beforeEach(() => {
    loadCategory({});
  });

  it("takes the locks, checks, then replaces the device's vote in one transaction", async () => {
    const result = await caller.award.vote({ nominationId: "nom-a" });

    expect(result).toBe("new-vote");
    // Show lock (shared), then device lock with the active check
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(String(tx.$queryRaw.mock.calls[0]?.[0])).toContain(
      "pg_advisory_xact_lock_shared",
    );
    expect(tx.nomination.count).toHaveBeenCalledWith({
      where: { id: { in: ["nom-a"] }, categoryId: "cat" },
    });
    expect(tx.vote.deleteMany).toHaveBeenCalledWith({
      where: { deviceId: "device-1", nomination: { categoryId: "cat" } },
    });
    expect(tx.vote.create).toHaveBeenCalledWith({
      data: { deviceId: "device-1", nominationId: "nom-a" },
    });
    const order = callOrder(
      tx.$queryRaw,
      tx.nomination.count,
      tx.vote.deleteMany,
      tx.vote.create,
    );
    expect(order).toEqual([...order].sort((a, b) => a! - b!));
  });

  it("rejects without changing anything once the category is closed", async () => {
    lockedCategory.isActive = false;

    await expect(
      caller.award.vote({ nominationId: "nom-a" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Voting is not currently active for this category",
    });
    expect(tx.vote.deleteMany).not.toHaveBeenCalled();
    expect(tx.vote.create).not.toHaveBeenCalled();
  });

  it("refuses a vote that waited for the reveal, without changing anything", async () => {
    lockedCategory.revealed = true;

    await expect(
      caller.award.vote({ nominationId: "nom-a" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", ...VOTING_CLOSED });
    expect(tx.vote.deleteMany).not.toHaveBeenCalled();
    expect(tx.vote.create).not.toHaveBeenCalled();
  });

  it.each([
    ["inactive", { isActive: false }],
    ["revealed", { revealed: true }],
  ])(
    "fails fast, without a transaction, when the category is already %s",
    async (_, state) => {
      loadCategory(state);

      await expect(
        caller.award.vote({ nominationId: "nom-a" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it("says to reload, without changing anything, if the nomination was removed", async () => {
    tx.nomination.count.mockResolvedValue(0);

    await expect(
      caller.award.vote({ nominationId: "nom-a" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "A nomination was removed. Please reload the page.",
    });
    expect(tx.vote.deleteMany).not.toHaveBeenCalled();
  });

  it.each(["P2028", "P2034"])(
    "asks the voter to try again when the transaction can't run (%s)",
    async code => {
      db.$transaction.mockRejectedValue(prismaError(code));

      await expect(
        caller.award.vote({ nominationId: "nom-a" }),
      ).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
        message: "Couldn't save your vote just now. Please try again.",
      });
    },
  );
});

describe("submitRanking", () => {
  const rankings = [
    { nominationId: "nom-a", rank: 1 },
    { nominationId: "nom-b", rank: 2 },
  ];

  beforeEach(() => {
    db.category.findUnique.mockResolvedValue({
      type: "RANKING",
      rankingTop: 2,
      isActive: true,
      revealed: false,
      sessionId: "show",
      nominations: [{ id: "nom-a" }, { id: "nom-b" }],
    });
  });

  it("replaces the device's ranking inside one locked transaction", async () => {
    const result = await caller.award.submitRanking({
      categoryId: "cat",
      rankings,
    });

    expect(result).toBe("new-ranking");
    expect(tx.nomination.count).toHaveBeenCalledWith({
      where: { id: { in: ["nom-a", "nom-b"] }, categoryId: "cat" },
    });
    expect(tx.vote.deleteMany).toHaveBeenCalledWith({
      where: { deviceId: "device-1", nomination: { categoryId: "cat" } },
    });
    expect(tx.vote.createManyAndReturn).toHaveBeenCalledWith({
      data: rankings.map(r => ({ deviceId: "device-1", ...r })),
    });
  });

  it("rejects without changing anything once the category is closed", async () => {
    lockedCategory.isActive = false;

    await expect(
      caller.award.submitRanking({ categoryId: "cat", rankings }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(tx.vote.deleteMany).not.toHaveBeenCalled();
    expect(tx.vote.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("refuses a ranking that waited for the reveal, without changing anything", async () => {
    lockedCategory.revealed = true;

    await expect(
      caller.award.submitRanking({ categoryId: "cat", rankings }),
    ).rejects.toMatchObject(VOTING_CLOSED);
    expect(tx.vote.deleteMany).not.toHaveBeenCalled();
    expect(tx.vote.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("says voting is closed before validating a stale form", async () => {
    db.category.findUnique.mockResolvedValue({
      type: "RANKING",
      rankingTop: 3,
      isActive: false,
      revealed: false,
      sessionId: "show",
      nominations: [{ id: "nom-a" }, { id: "nom-b" }],
    });

    await expect(
      caller.award.submitRanking({ categoryId: "cat", rankings }),
    ).rejects.toMatchObject({
      message: "Voting is not currently active for this category",
    });
  });
});

describe("setActiveCategory", () => {
  it("activates the category and deactivates the others, holding the show's lock", async () => {
    const result = await caller.award.setActiveCategory({
      categoryId: "b",
      active: true,
    });

    expect(db.category.updateMany).toHaveBeenCalledWith({
      where: { sessionId: "show" },
      data: { isActive: false },
    });
    expect(db.category.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { isActive: true },
    });
    expect(db.$transaction).toHaveBeenCalledWith([
      "lock-show",
      "deactivate-all",
      "update-one",
    ]);
    expect(result).toBe("update-one");
  });

  it("only deactivates the category when asked to stop", async () => {
    await caller.award.setActiveCategory({ categoryId: "b", active: false });

    expect(db.category.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { isActive: false },
    });
    expect(db.category.updateMany).not.toHaveBeenCalled();
    expect(db.$transaction).toHaveBeenCalledWith(["lock-show", "update-one"]);
  });

  it.each([true, false])(
    "sets the same state when repeated (active: %s)",
    async active => {
      await caller.award.setActiveCategory({ categoryId: "b", active });
      await caller.award.setActiveCategory({ categoryId: "b", active });

      const setTo = { where: { id: "b" }, data: { isActive: active } };
      expect(db.category.update).toHaveBeenCalledTimes(2);
      expect(db.category.update).toHaveBeenNthCalledWith(1, setTo);
      expect(db.category.update).toHaveBeenNthCalledWith(2, setTo);
    },
  );

  it.each([true, false])(
    "reports a category deleted mid-click as not found (active: %s)",
    async active => {
      db.$transaction.mockRejectedValue(prismaError("P2025"));

      await expect(
        caller.award.setActiveCategory({ categoryId: "b", active }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    },
  );
});

describe("host actions that take the show's lock", () => {
  it.each([
    [
      "resetCategoryVotes",
      () => caller.award.resetCategoryVotes({ categoryId: "b" }),
      "delete-votes",
    ],
    [
      "resetAllVotes",
      () => caller.award.resetAllVotes({ sessionId: "show" }),
      "delete-votes",
    ],
    [
      "deleteNomination",
      () => caller.award.deleteNomination({ id: "n" }),
      "delete-nomination",
    ],
    [
      "deleteCategory",
      () => caller.award.deleteCategory({ id: "b" }),
      "delete-category",
    ],
    [
      "deleteSession",
      () => caller.award.deleteSession({ id: "show" }),
      "delete-show",
    ],
    [
      "setCategoryRevealed",
      () => caller.award.setCategoryRevealed({ id: "b", revealed: true }),
      "update-one",
    ],
  ])("%s holds the show's lock", async (_, run, query) => {
    await run();

    expect(db.$transaction).toHaveBeenCalledWith(["lock-show", query]);
  });

  it.each([
    [
      "resetCategoryVotes",
      () => caller.award.resetCategoryVotes({ categoryId: "b" }),
    ],
    ["deleteNomination", () => caller.award.deleteNomination({ id: "n" })],
    [
      "setActiveCategory",
      () => caller.award.setActiveCategory({ categoryId: "b", active: true }),
    ],
  ])(
    "%s asks the host to try again when the database is busy",
    async (_, run) => {
      db.$transaction.mockRejectedValue(prismaError("P2028"));

      await expect(run()).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
        message: "Couldn't save that change just now. Please try again.",
      });
    },
  );
});
