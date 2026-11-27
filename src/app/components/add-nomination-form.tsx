"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";

import { InlineEditForm } from "~/app/components/inline-edit-form";
import {
  NominationFields,
  usePicture,
} from "~/app/components/nomination-fields";
import { Button } from "~/components/ui/button";
import { type CategoryType } from "~/generated/prisma/enums";
import { useShowChange } from "~/lib/hooks/useShowChange";
import {
  nominationFieldsSchema,
  type NominationFieldValues,
} from "~/lib/schemas";
import { ADDING, updateCategory } from "~/lib/show-changes";
import { useTRPC } from "~/trpc/react";

type AddNominationProps = {
  categoryId: string;
  categoryType: CategoryType;
};

/**
 * Adding nominations to a category on the manage page: an "Add nomination" button that opens the
 * form in place. A category without nominations has it open from the start (adding them is its
 * next step), without taking focus from wherever the host is.
 */
export function AddNomination({
  isEmpty,
  ...props
}: AddNominationProps & { isEmpty: boolean }) {
  // Opened by the host (focus moves into it) or open from the start
  const [open, setOpen] = useState<"asked" | "start" | false>(
    isEmpty ? "start" : false,
  );

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen("asked")}
      >
        <Plus className="size-4" />
        Add nomination
      </Button>
    );
  }
  return (
    <AddNominationForm
      {...props}
      takeFocus={open === "asked"}
      onDone={() => setOpen(false)}
    />
  );
}

/** Stays open after each nomination, ready for the next one, until the host closes it */
function AddNominationForm({
  categoryId,
  categoryType,
  takeFocus,
  onDone,
}: AddNominationProps & { takeFocus: boolean; onDone: () => void }) {
  const form = useForm<NominationFieldValues>({
    resolver: zodResolver(nominationFieldsSchema),
    defaultValues: { name: "", description: "" },
  });

  const trpc = useTRPC();
  const showChange = useShowChange();
  // The nomination shows straight away, marked as being added until the server has saved it (and
  // copied it to the category's aggregates). If the server refuses it, it goes, and the form keeps
  // what was typed.
  const addNomination = useMutation(
    trpc.award.addNomination.mutationOptions({
      ...showChange(
        (
          categories,
          added: { categoryId: string; name: string; description?: string },
        ) =>
          updateCategory(categories, added.categoryId, c => ({
            ...c,
            nominations: [
              ...c.nominations,
              {
                id: `${ADDING}${Date.now()}`,
                categoryId: c.id,
                name: added.name,
                description: added.description ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
                _count: { votes: 0 },
                votes: [],
              },
            ],
          })),
      ),
      onSuccess: (_, added) => {
        // Unless the host has started typing the next one meanwhile (what was sent is trimmed)
        const { name, description } = form.getValues();
        if (
          name.trim() === added.name &&
          (description ?? "").trim() === (added.description ?? "")
        ) {
          form.reset();
        }
        form.setFocus("name");
      },
    }),
  );

  const { picture, canSave } = usePicture(form, categoryType === "IMAGE");

  const onSubmit = (values: NominationFieldValues) => {
    if (!canSave()) return;
    addNomination.mutate({ ...values, categoryId });
  };

  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <InlineEditForm
        form={form}
        onSubmit={onSubmit}
        onCancel={onDone}
        isSaving={addNomination.isPending}
        submitLabel="Add nomination"
        savingLabel="Adding..."
        cancelLabel="Close"
        takeFocus={takeFocus}
      >
        <NominationFields control={form.control} picture={picture} />
      </InlineEditForm>
    </div>
  );
}
