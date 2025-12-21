import { z } from "zod";

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
    isAggregate: z.boolean().optional(),
    sourceCategories: z.array(z.string()),
  })
  .refine(
    data =>
      !data.isAggregate ||
      (data.sourceCategories && data.sourceCategories.length > 0),
    {
      path: ["sourceCategories"],
      error: "Aggregate categories must have at least one source category",
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
