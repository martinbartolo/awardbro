import { describe, expect, it } from "vitest";

import { describeManageError, type ManageError } from "./manage-error";

const error = (message: string, code?: string) =>
  ({
    message,
    data: code ? { code } : undefined,
  }) as ManageError;

describe("describeManageError", () => {
  it("reports lost access with the server's message, ignoring the fallback", () => {
    expect(
      describeManageError(
        error("Enter the management password to make changes", "UNAUTHORIZED"),
        "Failed to delete category",
      ),
    ).toEqual({
      accessLost: true,
      message: "Enter the management password to make changes",
    });
  });

  it("shows the fallback for any other error", () => {
    expect(
      describeManageError(
        error("Award show not found", "NOT_FOUND"),
        "Failed to delete category",
      ),
    ).toEqual({ accessLost: false, message: "Failed to delete category" });
  });

  it("shows the server's message when there's no fallback", () => {
    expect(
      describeManageError(
        error("Aggregate categories need at least one source", "BAD_REQUEST"),
      ),
    ).toEqual({
      accessLost: false,
      message: "Aggregate categories need at least one source",
    });
  });

  it("handles a network error, which has no tRPC data", () => {
    expect(describeManageError(error("Failed to fetch"))).toEqual({
      accessLost: false,
      message: "Failed to fetch",
    });
  });

  it.each([
    ["no fallback", undefined],
    ["lost access", "UNAUTHORIZED"],
  ])("never shows an empty message (%s)", (_, code) => {
    expect(describeManageError(error("", code)).message).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
