import { beforeEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => {
  vi.clearAllMocks();
  db.session.findFirst.mockResolvedValue({ id: "show", password: null });
  // Stand-ins for the queries, so the test can see which ones were batched
  db.category.updateMany.mockReturnValue("deactivate-all");
  db.category.update.mockReturnValue("activate-one");
  db.$transaction.mockImplementation((queries: unknown[]) =>
    Promise.resolve(queries),
  );
});

describe("setActiveCategory", () => {
  it("deactivates the others and activates the category in one transaction", async () => {
    db.category.findUnique.mockResolvedValue({
      isActive: false,
      sessionId: "show",
    });

    const result = await caller.award.setActiveCategory({ categoryId: "b" });

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
      "activate-one",
    ]);
    expect(result).toBe("activate-one");
  });

  it("only deactivates a category that is already active", async () => {
    db.category.findUnique.mockResolvedValue({
      isActive: true,
      sessionId: "show",
    });

    await caller.award.setActiveCategory({ categoryId: "b" });

    expect(db.category.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { isActive: false },
    });
    expect(db.category.updateMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
