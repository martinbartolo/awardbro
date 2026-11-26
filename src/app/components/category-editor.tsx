"use client";

import { createContext, use, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  InlineEditForm,
  useCloseAfterRefresh,
} from "~/app/components/inline-edit-form";
import { SourceCategoryCheckboxes } from "~/app/components/source-category-checkboxes";
import { Button } from "~/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
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
  const queryClient = useQueryClient();
  const form = useForm<CategoryUpdateValues>({
    resolver: zodResolver(categoryUpdateSchema),
    defaultValues: {
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      rankingTop: category.rankingTop ?? undefined,
      // Only an aggregate has sources; sending none would be refused
      sourceCategories:
        category.type === "AGGREGATE" ? category.sourceCategoryIds : undefined,
    },
  });
  const { close, isRefreshing } = useCloseAfterRefresh(onDone);

  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const update = useMutation(
    trpc.award.updateCategory.mutationOptions({
      onSuccess: () => {
        toast.success("Category updated");
        // The add-category form lists category names as aggregate sources
        void queryClient.invalidateQueries(
          trpc.award.getSessionCategories.pathFilter(),
        );
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
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {category.type === "RANKING" && (
        <FormField
          control={form.control}
          name="rankingTop"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How many to rank?</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  disabled={category.hasVotes}
                  {...field}
                  value={field.value ?? ""}
                  onChange={e =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10),
                    )
                  }
                  className="w-24"
                />
              </FormControl>
              <FormDescription>
                {category.hasVotes
                  ? "People have already voted, and changing this would change their points. Reset the category's votes to change it."
                  : `1st place gets ${field.value ?? "N"} points, 2nd gets one fewer, and so on.`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {category.type === "AGGREGATE" && (
        <FormField
          control={form.control}
          name="sourceCategories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Categories</FormLabel>
              <FormDescription>
                Nominations with the same name in these categories have their
                scores added up.
              </FormDescription>
              <SourceCategoryCheckboxes
                options={sourceOptions}
                value={field.value ?? []}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </InlineEditForm>
  );
}
