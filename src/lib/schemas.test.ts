import { describe, expect, it } from "vitest";

import {
  categoryFormSchema,
  rankingSubmissionSchema,
  sessionFormSchema,
} from "./schemas";

const show = { name: "Movie Awards", slug: "movie-awards" };

/** The fields a parse rejected, each listed once */
const errorPaths = (result: {
  error?: { issues: { path: PropertyKey[] }[] };
}) =>
  result.error && [
    ...new Set(result.error.issues.map(issue => issue.path.join("."))),
  ];

describe("sessionFormSchema slug", () => {
  it.each(["movie-awards", "awards2026", "a"])("accepts %s", slug => {
    expect(sessionFormSchema.safeParse({ ...show, slug }).success).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["with capitals", "Movie-Awards"],
    ["with spaces", "movie awards"],
    ["with other symbols", "movie_awards!"],
    ["over 100 characters", "a".repeat(101)],
  ])("rejects a slug %s", (_, slug) => {
    expect(errorPaths(sessionFormSchema.safeParse({ ...show, slug }))).toEqual([
      "slug",
    ]);
  });
});

describe("sessionFormSchema password", () => {
  it.each([
    ["left out", {}],
    ["left empty", { password: "" }],
  ])("is optional when %s", (_, password) => {
    expect(sessionFormSchema.safeParse({ ...show, ...password }).success).toBe(
      true,
    );
  });

  it("accepts a password of 4 to 100 characters", () => {
    for (const password of ["abcd", "a".repeat(100)]) {
      expect(sessionFormSchema.safeParse({ ...show, password }).success).toBe(
        true,
      );
    }
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

  it("rejects a password over 100 characters", () => {
    const result = sessionFormSchema.safeParse({
      ...show,
      password: "a".repeat(101),
    });

    expect(errorPaths(result)).toEqual(["password"]);
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
