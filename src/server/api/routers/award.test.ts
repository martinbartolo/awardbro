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
  // The client passed to interactive transactions (saveVote, deletes)
  tx: {
    $queryRaw: vi.fn(),
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    nomination: {
      count: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
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
let lockedCategory: {
  isActive: boolean;
  votingClosed: boolean;
  revealed: boolean;
  rankingTop: number | null;
} = { isActive: true, votingClosed: false, revealed: false, rankingTop: null };

beforeEach(() => {
  vi.clearAllMocks();
  lockedCategory = {
    isActive: true,
    votingClosed: false,
    revealed: false,
    rankingTop: null,
  };
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
  // A category with no aggregates, so deletes have no copies to reconcile
  tx.category.findMany.mockResolvedValue([]);
  tx.nomination.findMany.mockResolvedValue([]);
  tx.nomination.delete.mockResolvedValue({ categoryId: "b", name: "Dune" });
  tx.category.delete.mockResolvedValue({ id: "b" });
  tx.vote.create.mockResolvedValue("new-vote");
  tx.vote.createManyAndReturn.mockResolvedValue("new-ranking");
});

const VOTING_CLOSED = { message: "Voting has closed for this category" };

const callOrder = (...fns: { mock: { invocationCallOrder: number[] } }[]) =>
  fns.map(fn => fn.mock.invocationCallOrder[0]);

describe("vote", () => {
  /** The nomination's category, as `vote` loads it before the transaction */
  const loadCategory = (state: {
    isActive?: boolean;
    votingClosed?: boolean;
    revealed?: boolean;
  }) =>
    db.nomination.findUnique.mockResolvedValue({
      categoryId: "cat",
      category: {
        type: "NORMAL",
        isActive: true,
        votingClosed: false,
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

  it.each([
    ["the host closed voting", { votingClosed: true }],
    ["the reveal", { revealed: true }],
  ])(
    "refuses a vote that waited for %s, without changing anything",
    async (_, state) => {
      Object.assign(lockedCategory, state);

      await expect(
        caller.award.vote({ nominationId: "nom-a" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST", ...VOTING_CLOSED });
      expect(tx.vote.deleteMany).not.toHaveBeenCalled();
      expect(tx.vote.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["inactive", { isActive: false }],
    ["closed", { votingClosed: true }],
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
    lockedCategory.rankingTop = 2;
  });

  it("rejects a ranking whose number of places changed before it was saved", async () => {
    // The host changed it after the ranking was checked, before the locks were taken
    lockedCategory.rankingTop = 3;

    await expect(
      caller.award.submitRanking({ categoryId: "cat", rankings }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(tx.vote.deleteMany).not.toHaveBeenCalled();
    expect(tx.vote.createManyAndReturn).not.toHaveBeenCalled();
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

describe("setCategoryStage", () => {
  /** The category as setCategoryStage finds it, holding the show's lock */
  const found = (category: Record<string, unknown>) =>
    tx.category.findUnique.mockResolvedValue({
      type: "NORMAL",
      isActive: false,
      votingClosed: false,
      revealed: false,
      ...category,
    });

  beforeEach(() => {
    found({});
  });

  it.each([
    ["open", { isActive: true, votingClosed: false, revealed: false }],
    ["closed", { isActive: true, votingClosed: true, revealed: false }],
    ["revealed", { isActive: true, votingClosed: true, revealed: true }],
  ] as const)(
    "%s: puts the category on the big screen and takes the others off, holding the show's lock",
    async (stage, data) => {
      await caller.award.setCategoryStage({ id: "b", stage });

      expect(String(tx.$queryRaw.mock.calls[0]?.[0])).toContain(
        "pg_advisory_xact_lock(",
      );
      expect(tx.category.updateMany).toHaveBeenCalledWith({
        where: { sessionId: "show", isActive: true, id: { not: "b" } },
        data: { isActive: false },
      });
      expect(tx.category.update).toHaveBeenCalledWith({
        where: { id: "b" },
        data,
      });
      const [lock, update] = callOrder(tx.$queryRaw, tx.category.update);
      expect(lock).toBeLessThan(update!);
    },
  );

  it("off: only takes the category off the big screen", async () => {
    await caller.award.setCategoryStage({ id: "b", stage: "off" });

    expect(tx.category.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { isActive: false },
    });
    expect(tx.category.updateMany).not.toHaveBeenCalled();
  });

  it("refuses to open voting in an aggregate, which takes no votes", async () => {
    found({ type: "AGGREGATE" });

    await expect(
      caller.award.setCategoryStage({ id: "b", stage: "open" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(tx.category.update).not.toHaveBeenCalled();
  });

  it("refuses a step from an out-of-date page, without changing anything", async () => {
    // Another device revealed it after this page showed it as voting
    found({ isActive: true, votingClosed: true, revealed: true });

    await expect(
      caller.award.setCategoryStage({ id: "b", stage: "closed", from: "open" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(tx.category.update).not.toHaveBeenCalled();
  });

  it("takes a step from the stage the page showed", async () => {
    found({ isActive: true });

    await caller.award.setCategoryStage({
      id: "b",
      stage: "closed",
      from: "open",
    });

    expect(tx.category.update).toHaveBeenCalled();
  });

  it("reports a category deleted mid-click as not found", async () => {
    tx.category.findUnique.mockResolvedValue(null);

    await expect(
      caller.award.setCategoryStage({ id: "b", stage: "open" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Category not found",
    });
  });
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
      "deleteSession",
      () => caller.award.deleteSession({ id: "show" }),
      "delete-show",
    ],
  ])("%s holds the show's lock", async (_, run, query) => {
    await run();

    expect(db.$transaction).toHaveBeenCalledWith(["lock-show", query]);
  });

  it.each([
    [
      "deleteNomination",
      () => caller.award.deleteNomination({ id: "n" }),
      tx.nomination.delete,
    ],
    [
      "deleteCategory",
      () => caller.award.deleteCategory({ id: "b" }),
      tx.category.delete,
    ],
  ])("%s takes the show's lock before deleting", async (_, run, remove) => {
    await run();

    expect(String(tx.$queryRaw.mock.calls[0]?.[0])).toContain(
      "pg_advisory_xact_lock(",
    );
    const [lock, deleted] = callOrder(tx.$queryRaw, remove);
    expect(lock).toBeLessThan(deleted!);
  });

  it.each([
    [
      "resetCategoryVotes",
      () => caller.award.resetCategoryVotes({ categoryId: "b" }),
    ],
    ["deleteNomination", () => caller.award.deleteNomination({ id: "n" })],
    [
      "setCategoryStage",
      () => caller.award.setCategoryStage({ id: "b", stage: "revealed" }),
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
