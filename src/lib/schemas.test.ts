import { describe, expect, it } from "vitest";

import {
  categoryFormSchema,
  nominationFormSchema,
  rankingSubmissionSchema,
  sessionFormSchema,
} from "./schemas";

const show = { name: "Movie Awards" };

/** The fields a parse rejected, each listed once */
const errorPaths = (result: {
  error?: { issues: { path: PropertyKey[] }[] };
}) =>
  result.error && [
    ...new Set(result.error.issues.map(issue => issue.path.join("."))),
  ];

describe("sessionFormSchema password", () => {
  it.each([
    ["left out", {}],
    ["left empty", { password: "" }],
  ])("is required: refused when %s", (_, password) => {
    const result = sessionFormSchema.safeParse({ ...show, ...password });
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ["password"],
        message: "Password is required",
      }),
    );
  });

  it.each([
    ["4 characters", "abcd"],
    ["72 characters", "a".repeat(72)],
    ["spaces inside", "open sesame"],
    ["72 bytes of accents", "\u00e9".repeat(36)],
    // A letter plus a combining accent is counted as the single letter it's stored as
    ["72 bytes of decomposed accents", "e\u0301".repeat(36)],
  ])("accepts a password of %s", (_, password) => {
    expect(sessionFormSchema.safeParse({ ...show, password }).success).toBe(
      true,
    );
  });

  const tooShort = "Password must be at least 4 characters";
  const untrimmed = "Password can't start or end with a space or line break";
  const tooLong =
    "Password is too long: use at most 72 characters (fewer with accents or emoji)";

  it.each([
    ["3 characters", "abc", tooShort],
    ["2 emoji", "🏆🏆", tooShort],
    ["only spaces", "    ", untrimmed],
    ["a leading space", " secret", untrimmed],
    ["a trailing space", "secret ", untrimmed],
    ["a trailing newline", "secret\n", untrimmed],
    ["73 characters", "a".repeat(73), tooLong],
    ["over 72 bytes of accents", "\u00e9".repeat(37), tooLong],
    ["over 72 bytes of emoji", "🏆".repeat(19), tooLong],
  ])("rejects a password with %s", (_, password, message) => {
    const result = sessionFormSchema.safeParse({ ...show, password });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["password"], message }),
    ]);
  });
});

describe("categoryFormSchema", () => {
  const category = {
    sessionId: "show",
    name: "Best Picture",
    type: "NORMAL",
    sourceCategories: [],
  };

  it("accepts a normal category", () => {
    expect(categoryFormSchema.safeParse(category).success).toBe(true);
  });

  it.each([2, 10])("accepts ranking the top %i", rankingTop => {
    expect(
      categoryFormSchema.safeParse({ ...category, type: "RANKING", rankingTop })
        .success,
    ).toBe(true);
  });

  it.each([1, 11, 2.5])("rejects ranking the top %s", rankingTop => {
    expect(
      errorPaths(
        categoryFormSchema.safeParse({
          ...category,
          type: "RANKING",
          rankingTop,
        }),
      ),
    ).toContain("rankingTop");
  });

  it("requires rankingTop for ranking categories", () => {
    expect(
      errorPaths(
        categoryFormSchema.safeParse({ ...category, type: "RANKING" }),
      ),
    ).toEqual(["rankingTop"]);
  });

  it("requires at least one source for aggregate categories", () => {
    const aggregate = { ...category, type: "AGGREGATE" };

    expect(errorPaths(categoryFormSchema.safeParse(aggregate))).toEqual([
      "sourceCategories",
    ]);
    expect(
      categoryFormSchema.safeParse({ ...aggregate, sourceCategories: ["a"] })
        .success,
    ).toBe(true);
  });

  it("accepts up to 100 sources", () => {
    const aggregate = { ...category, type: "AGGREGATE" };
    const sources = (n: number) =>
      Array.from({ length: n }, (_, i) => `category-${i}`);

    expect(
      categoryFormSchema.safeParse({
        ...aggregate,
        sourceCategories: sources(100),
      }).success,
    ).toBe(true);
    expect(
      errorPaths(
        categoryFormSchema.safeParse({
          ...aggregate,
          sourceCategories: sources(101),
        }),
      ),
    ).toEqual(["sourceCategories"]);
  });

  it("rejects an unknown category type", () => {
    expect(
      errorPaths(categoryFormSchema.safeParse({ ...category, type: "POLL" })),
    ).toEqual(["type"]);
  });
});

describe("nominationFormSchema", () => {
  it("trims the name and description", () => {
    expect(
      nominationFormSchema.parse({
        categoryId: "category",
        name: "  Dune ",
        description: " Part Two\n",
      }),
    ).toEqual({
      categoryId: "category",
      name: "Dune",
      description: "Part Two",
    });
  });

  it("rejects a name of only spaces", () => {
    expect(
      errorPaths(
        nominationFormSchema.safeParse({ categoryId: "category", name: "   " }),
      ),
    ).toEqual(["name"]);
  });
});

describe("rankingSubmissionSchema", () => {
  const submission = (rankings: { nominationId: string; rank: number }[]) =>
    rankingSubmissionSchema.safeParse({ categoryId: "category", rankings });

  it("accepts ranks from 1", () => {
    expect(
      submission([
        { nominationId: "a", rank: 1 },
        { nominationId: "b", rank: 2 },
      ]).success,
    ).toBe(true);
  });

  it("rejects an empty ranking", () => {
    expect(errorPaths(submission([]))).toEqual(["rankings"]);
  });

  it.each([0, -1, 1.5])("rejects rank %s", rank => {
    expect(errorPaths(submission([{ nominationId: "a", rank }]))).toEqual([
      "rankings.0.rank",
    ]);
  });

  it("rejects a missing nomination ID", () => {
    expect(errorPaths(submission([{ nominationId: "", rank: 1 }]))).toEqual([
      "rankings.0.nominationId",
    ]);
  });
});
