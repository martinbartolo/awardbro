import { z } from "zod";

import { CategoryType } from "~/generated/prisma/enums";

// Derive Zod enum from Prisma-generated enum to ensure they stay in sync
const categoryTypeValues = Object.values(CategoryType) as [string, ...string[]];
export const categoryTypeEnum = z.enum(categoryTypeValues);

/** bcrypt ignores everything after the first 72 bytes of a password */
const MAX_PASSWORD_BYTES = 72;

/**
 * The form of a password that is hashed and checked. The same accented letter can arrive as one
 * code point or as a letter plus a combining accent, depending on the keyboard.
 */
export const normalizePassword = (password: string) =>
  password.normalize("NFC");

// Reuse the exact schemas from award.ts
export const sessionFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  // Required: the room code is on the big screen, so the password is what keeps the audience out
  // of the manage page. (Shows from before it was required may have none, and are open.)
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    // Counts characters, not UTF-16 code units, so two emoji aren't enough
    .refine(
      password => [...password].length >= 4,
      "Password must be at least 4 characters",
    )
    // Also rejects a password of only spaces, which would look like no password at all
    .refine(
      password => password.trim() === password,
      "Password can't start or end with a space or line break",
    )
    .refine(
      password =>
        new TextEncoder().encode(normalizePassword(password)).length <=
        MAX_PASSWORD_BYTES,
      `Password is too long: use at most ${MAX_PASSWORD_BYTES} characters (fewer with accents or emoji)`,
    ),
});

/** What a host fills in for a category, whether creating or editing it */
const categoryFields = {
  // Trimmed, so a stray space doesn't end up on the big screen
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  description: z.string().trim().max(500, "Description is too long").optional(),
  /** Ranking categories only */
  rankingTop: z
    .number()
    .int()
    .min(2, "Must rank at least 2 options")
    .max(10, "Cannot rank more than 10 options")
    .optional(),
};

const sourceCategoriesField = z
  .array(z.string())
  .max(100, "Too many source categories");

export const categoryFormSchema = z
  .object({
    sessionId: z.string().min(1, "Session ID is required"),
    ...categoryFields,
    type: categoryTypeEnum,
    sourceCategories: sourceCategoriesField,
    hideVoteCounts: z.boolean().optional(),
    winnerOnly: z.boolean().optional(),
  })
  .refine(
    data => data.type !== "AGGREGATE" || data.sourceCategories.length > 0,
    {
      path: ["sourceCategories"],
      message: "Aggregate categories must have at least one source category",
    },
  )
  .refine(
    data =>
      data.type !== "RANKING" ||
      (data.rankingTop !== undefined && data.rankingTop >= 2),
    {
      path: ["rankingTop"],
      message: "Ranking categories must specify how many options to rank",
    },
  );

/** The fields a host can change on a category after creating it. Its type stays as it is. */
export const categoryUpdateSchema = z.object({
  id: z.string().min(1, "Category ID is required"),
  ...categoryFields,
  /** Aggregate categories only */
  sourceCategories: sourceCategoriesField
    .min(1, "Aggregate categories must have at least one source category")
    .optional(),
});

const nominationFields = {
  // Trimmed, so "Dune " and "Dune" are the same name
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  description: z.string().trim().max(500, "Description is too long").optional(),
};

/** The fields of the add and edit nomination forms */
export const nominationFieldsSchema = z.object(nominationFields);

export const nominationFormSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  ...nominationFields,
});

export const nominationUpdateSchema = z.object({
  id: z.string().min(1, "Nomination ID is required"),
  ...nominationFields,
});

export const rankingSubmissionSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  rankings: z
    .array(
      z.object({
        nominationId: z.string().min(1, "Nomination ID is required"),
        rank: z.number().int().min(1, "Rank must be at least 1"),
      }),
    )
    .min(1, "At least one ranking is required"),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type CategoryUpdateValues = z.infer<typeof categoryUpdateSchema>;
export type NominationFieldValues = z.infer<typeof nominationFieldsSchema>;
export type RankingSubmissionValues = z.infer<typeof rankingSubmissionSchema>;
