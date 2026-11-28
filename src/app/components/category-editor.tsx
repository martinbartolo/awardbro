"use client";

import { createContext, use, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  CategoryFields,
  type CategoryFieldValues,
} from "~/app/components/category-fields";
import { InlineEditForm } from "~/app/components/inline-edit-form";
import { Button } from "~/components/ui/button";
import { type CategoryType } from "~/generated/prisma/enums";
import { useShowChange } from "~/lib/hooks/useShowChange";
import { categoryUpdateSchema, type CategoryUpdateValues } from "~/lib/schemas";
import { renameSource, updateCategory } from "~/lib/show-changes";
import { useTRPC } from "~/trpc/react";

type EditableCategory = {
  id: string;
  name: string;
  description: string | null;
  type: CategoryType;
  rankingTop: number | null;
  sourceCategoryIds: string[];
  /** Whether anyone has voted in it, which fixes a ranking's number of places */
  hasVotes: boolean;
};

const EditingContext = createContext<(() => void) | null>(null);

/**
 * A category's header on the manage page, which an `EditCategoryButton` inside it turns into a
 * form to edit the category in place.
 */
export function CategoryEditor({
  category,
  sourceOptions,
  children,
}: {
  category: EditableCategory;
  /** The categories an aggregate can add up: the show's non-aggregate categories */
  sourceOptions: { id: string; name: string }[];
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditCategoryForm
        category={category}
        sourceOptions={sourceOptions}
        onDone={() => setEditing(false)}
      />
    );
  }
  return (
    <EditingContext value={() => setEditing(true)}>{children}</EditingContext>
  );
}

export function EditCategoryButton() {
  const startEditing = use(EditingContext);
  if (!startEditing) return null;
  return (
    <Button
      variant="ghost"
      size="iconSm"
      tooltip="Edit category"
      aria-label="Edit category"
      onClick={startEditing}
    >
      <PencilSimpleIcon />
    </Button>
  );
}

function EditCategoryForm({
  category,
  sourceOptions,
  onDone,
}: {
  category: EditableCategory;
  sourceOptions: { id: string; name: string }[];
  onDone: () => void;
}) {
  const form = useForm<CategoryUpdateValues>({
    resolver: zodResolver(categoryUpdateSchema),
    defaultValues: {
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      // Left out (so unchanged) once people have voted: it can't change then
      rankingTop: category.hasVotes
        ? undefined
        : (category.rankingTop ?? undefined),
      // Only an aggregate has sources; sending none would be refused
      sourceCategories:
        category.type === "AGGREGATE" ? category.sourceCategoryIds : undefined,
    },
  });
  const trpc = useTRPC();
  const showChange = useShowChange();
  // The category shows its new name and description straight away. The form stays open until
  // the server has saved them, so a refused change (a repeated name, say) keeps what was typed.
  const update = useMutation(
    trpc.award.updateCategory.mutationOptions({
      ...showChange((categories, values: CategoryUpdateValues) =>
        renameSource(
          updateCategory(categories, values.id, c => ({
            ...c,
            name: values.name,
            description: values.description ?? null,
            rankingTop: values.rankingTop ?? c.rankingTop,
            // An aggregate's new sources, in the running order
            sourceCategories: values.sourceCategories
              ? categories.filter(s => values.sourceCategories!.includes(s.id))
              : c.sourceCategories,
          })),
          values.id,
          values.name,
        ),
      ),
      onSuccess: () => {
        toast.success("Category updated");
        onDone();
      },
    }),
  );

  return (
    <InlineEditForm
      form={form}
      onSubmit={values => update.mutate(values)}
      onCancel={onDone}
      isSaving={update.isPending}
    >
      <CategoryFields
        control={form.control as unknown as Control<CategoryFieldValues>}
        type={category.type}
        sourceOptions={sourceOptions}
        lockedPlaces={category.hasVotes ? category.rankingTop : null}
      />
    </InlineEditForm>
  );
}
