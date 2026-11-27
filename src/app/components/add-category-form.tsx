"use client";

import { useId, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type Control, useForm, useWatch } from "react-hook-form";

import {
  CATEGORY_TYPES,
  CategoryFields,
  type CategoryFieldValues,
} from "~/app/components/category-fields";
import {
  InlineEditForm,
  useCloseAfterRefresh,
} from "~/app/components/inline-edit-form";
import { Button } from "~/components/ui/button";
import { FormField } from "~/components/ui/form";
import { type CategoryType } from "~/generated/prisma/enums";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { categoryFormSchema, type CategoryFormValues } from "~/lib/schemas";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

type SourceOptions = { id: string; name: string }[];

/**
 * Adding a category on the manage page: an "Add category" button that opens the form in place. A
 * new category goes to the end of the running order, just above the button.
 */
export function AddCategory({
  sessionId,
  sourceOptions,
}: {
  sessionId: string;
  /** The categories an aggregate can add up: the show's non-aggregate categories */
  sourceOptions: SourceOptions;
}) {
  // Closed, open, or closed again after being open (focus goes back to the button)
  const [state, setState] = useState<"closed" | "open" | "returned">("closed");

  if (state !== "open") {
    return (
      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setState("open")}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- only when the host closes the form
        autoFocus={state === "returned"}
      >
        <Plus className="size-4" />
        Add category
      </Button>
    );
  }
  return (
    <section
      aria-labelledby="add-category"
      className="bg-card rounded-xl border p-4 sm:p-6"
    >
      <h3 id="add-category" className="mb-4 text-lg font-semibold">
        Add category
      </h3>
      <AddCategoryForm
        sessionId={sessionId}
        sourceOptions={sourceOptions}
        onDone={() => setState("returned")}
      />
    </section>
  );
}

function AddCategoryForm({
  sessionId,
  sourceOptions,
  onDone,
}: {
  sessionId: string;
  sourceOptions: SourceOptions;
  onDone: () => void;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      sessionId,
      name: "",
      description: "",
      type: "NORMAL",
      sourceCategories: [],
      rankingTop: 3,
    },
  });
  const type = useWatch({ control: form.control, name: "type" });
  // The form closes once the refreshed page shows the new category
  const { close, isRefreshing } = useCloseAfterRefresh(onDone);

  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const addCategory = useMutation(
    trpc.award.addCategory.mutationOptions({
      onSuccess: close,
      onError: onManageError(),
    }),
  );

  const onSubmit = (values: CategoryFormValues) =>
    addCategory.mutate({
      ...values,
      // Only the chosen type's own field is sent
      sourceCategories:
        values.type === "AGGREGATE" ? values.sourceCategories : [],
      rankingTop: values.type === "RANKING" ? values.rankingTop : undefined,
    });

  return (
    <InlineEditForm
      form={form}
      onSubmit={onSubmit}
      onCancel={onDone}
      isSaving={addCategory.isPending || isRefreshing}
      submitLabel="Add category"
      savingLabel="Adding..."
    >
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Type</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(CATEGORY_TYPES) as CategoryType[]).map(option => (
                <TypeChoice
                  key={option}
                  type={option}
                  name={field.name}
                  checked={field.value === option}
                  onChange={() => {
                    field.onChange(option);
                    // Hidden for other types, so a bad value mustn't block them
                    if (option !== "RANKING") form.resetField("rankingTop");
                  }}
                  // An aggregate needs other categories to add up
                  unavailable={
                    option === "AGGREGATE" && sourceOptions.length === 0
                  }
                />
              ))}
            </div>
          </fieldset>
        )}
      />
      <CategoryFields
        control={form.control as unknown as Control<CategoryFieldValues>}
        type={type as CategoryType}
        sourceOptions={sourceOptions}
      />
    </InlineEditForm>
  );
}

/**
 * One category type as a card to pick: a radio button named after the type, with what the type
 * does as its description
 */
function TypeChoice({
  type,
  name,
  checked,
  onChange,
  unavailable,
}: {
  type: CategoryType;
  name: string;
  checked: boolean;
  onChange: () => void;
  unavailable: boolean;
}) {
  const id = useId();
  const { label, description, icon: Icon } = CATEGORY_TYPES[type];
  return (
    <label
      className={cn(
        "flex gap-3 rounded-lg border p-3 transition-colors",
        "has-checked:border-primary has-checked:bg-primary/10",
        "has-focus-visible:ring-ring has-focus-visible:ring-2",
        unavailable
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-accent/50 cursor-pointer",
      )}
    >
      <input
        type="radio"
        name={name}
        value={type}
        checked={checked}
        onChange={onChange}
        disabled={unavailable}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        className="sr-only"
      />
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <span>
        <span id={`${id}-label`} className="block text-sm font-medium">
          {label}
        </span>
        <span
          id={`${id}-description`}
          className="text-muted-foreground block text-xs"
        >
          {unavailable ? "Add the categories it adds up first." : description}
        </span>
      </span>
    </label>
  );
}
