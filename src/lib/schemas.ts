import { z } from "zod";

import { CategoryType } from "~/generated/prisma/enums";

// Derive Zod enum from Prisma-generated enum to ensure they stay in sync
const categoryTypeValues = Object.values(CategoryType) as [string, ...string[]];
export const categoryTypeEnum = z.enum(categoryTypeValues);

// Reuse the exact schemas from award.ts
export const sessionFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug is too long")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  password: z
    .string()
    .min(4, "Password must be at least 4 characters")
    .max(100, "Password is too long")
    .optional(),
});

export const categoryFormSchema = z
  .object({
    sessionId: z.string().min(1, "Session ID is required"),
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    description: z.string().max(500, "Description is too long").optional(),
    type: categoryTypeEnum,
    sourceCategories: z.array(z.string()),
  })
  .refine(
    data => data.type !== "AGGREGATE" || data.sourceCategories.length > 0,
    {
      path: ["sourceCategories"],
      message: "Aggregate categories must have at least one source category",
    },
  );

export const nominationFormSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type NominationFormValues = z.infer<typeof nominationFormSchema>;
