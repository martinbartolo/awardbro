import { describe, expect, it } from "vitest";

import { sessionFormSchema } from "./schemas";

const show = { name: "Movie Awards", slug: "movie-awards" };

describe("sessionFormSchema password", () => {
  it.each([
    ["left out", {}],
    ["left empty", { password: "" }],
  ])("is optional when %s", (_, password) => {
    expect(sessionFormSchema.safeParse({ ...show, ...password }).success).toBe(
      true,
    );
  });

  it("accepts a password of at least 4 characters", () => {
    expect(
      sessionFormSchema.safeParse({ ...show, password: "abcd" }).success,
    ).toBe(true);
  });

  it("rejects a password shorter than 4 characters", () => {
    const result = sessionFormSchema.safeParse({ ...show, password: "abc" });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["password"],
        message: "Password must be at least 4 characters",
      }),
    ]);
  });
});
