import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "~/generated/prisma/client";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const db = vi.hoisted(() => ({
  // An open show (no password), so assertCanManage lets the call through
  session: { findFirst: vi.fn() },
  category: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("~/server/db", () => ({ db }));

const caller = createCaller(() =>
  createTRPCContext({ headers: new Headers(), resHeaders: new Headers() }),
);

const recordNotFound = () =>
  new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "test",
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.session.findFirst.mockResolvedValue({ id: "show", password: null });
  db.category.findUnique.mockResolvedValue({ sessionId: "show" });
  // Stand-ins for the queries, so the test can see which ones were batched
  db.category.updateMany.mockReturnValue("deactivate-all");
  db.category.update.mockReturnValue("update-one");
  db.$transaction.mockImplementation((queries: unknown[]) =>
    Promise.resolve(queries),
  );
});

describe("setActiveCategory", () => {
  it("activates the category and deactivates the others in one transaction", async () => {
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
    expect(db.$transaction).not.toHaveBeenCalled();
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

  it.each([
    [
      "activating",
      true,
      () => db.$transaction.mockRejectedValue(recordNotFound()),
    ],
    [
      "stopping",
      false,
      () => db.category.update.mockRejectedValue(recordNotFound()),
    ],
  ])(
    "reports a category deleted mid-click as not found when %s",
    async (_, active, deleteCategory) => {
      deleteCategory();

      await expect(
        caller.award.setActiveCategory({ categoryId: "b", active }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    },
  );
});
