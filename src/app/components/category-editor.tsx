"use client";

import { createContext, use, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  CategoryFields,
  type CategoryFieldValues,
} from "~/app/components/category-fields";
import {
  InlineEditForm,
  useCloseAfterRefresh,
} from "~/app/components/inline-edit-form";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { type CategoryType } from "~/generated/prisma/enums";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { categoryUpdateSchema, type CategoryUpdateValues } from "~/lib/schemas";
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
  hideVoteCounts: boolean;
  winnerOnly: boolean;
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
      <Pencil className="size-4" />
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
      hideVoteCounts: category.hideVoteCounts,
      winnerOnly: category.winnerOnly,
    },
  });
  const { close, isRefreshing } = useCloseAfterRefresh(onDone);

  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const update = useMutation(
    trpc.award.updateCategory.mutationOptions({
      onSuccess: () => {
        toast.success("Category updated");
        close();
      },
      onError: onManageError(),
    }),
  );

  return (
    <InlineEditForm
      form={form}
      onSubmit={values => update.mutate(values)}
      onCancel={onDone}
      isSaving={update.isPending || isRefreshing}
    >
      <CategoryFields
        control={form.control as unknown as Control<CategoryFieldValues>}
        type={category.type}
        sourceOptions={sourceOptions}
        lockedPlaces={category.hasVotes ? category.rankingTop : null}
      />

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Presentation</legend>
        <PresentationOption
          control={form.control}
          name="hideVoteCounts"
          label="Hide vote counts"
          description="The reveal shows the order without numbers."
        />
        <PresentationOption
          control={form.control}
          name="winnerOnly"
          label="Winner only"
          description="The reveal shows only first place."
        />
        {category.type === "AGGREGATE" && (
          <p className="text-muted-foreground text-sm">
            The options of the categories it adds up apply too: if one hides its
            counts or shows only its winner, this shows only the order.
          </p>
        )}
      </fieldset>
    </InlineEditForm>
  );
}

/** One of the options for how a category's reveal shows it on the big screen */
function PresentationOption({
  control,
  name,
  label,
  description,
}: {
  control: Control<CategoryUpdateValues>;
  name: "hideVoteCounts" | "winnerOnly";
  label: string;
  description: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start gap-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value ?? false}
              onCheckedChange={checked => field.onChange(checked === true)}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
        </FormItem>
      )}
    />
  );
}
