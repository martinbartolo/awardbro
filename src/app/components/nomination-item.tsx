"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { InlineEditForm } from "~/app/components/inline-edit-form";
import { NominationActions } from "~/app/components/nomination-actions";
import { NominationDescription } from "~/app/components/nomination-description";
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
import { isAdding, updateNomination } from "~/lib/show-changes";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

type Nomination = { id: string; name: string; description: string | null };

/**
 * A nomination on the manage page, as a row of its category's list: its name, description (a
 * thumbnail for a picture) and score, with buttons to edit it in place or delete it. Nominations
 * of an aggregate are copies of its sources', so they can't be edited there.
 */
export function NominationItem({
  nomination,
  categoryType,
  isImage,
  score,
}: {
  nomination: Nomination;
  categoryType: CategoryType;
  /** Whether its category shows pictures (see showsPictures) */
  isImage: boolean;
  /** Its score with its unit, such as "3 votes" */
  score: string;
}) {
  const [editing, setEditing] = useState(false);
  // Shown straight away while the server adds it (AddNomination)
  const adding = isAdding(nomination);

  return (
    <li className="px-3 py-2">
      {editing ? (
        <EditNominationForm
          nomination={nomination}
          categoryType={categoryType}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center gap-3">
          {isImage && (
            <NominationDescription
              description={nomination.description}
              isImage
              thumbnail
              imageClassName="h-10 w-14 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{nomination.name}</div>
            {!isImage && (
              <NominationDescription
                description={nomination.description}
                thumbnail
                className="text-muted-foreground line-clamp-1 text-xs"
                imageClassName="mt-1 h-10 w-14"
              />
            )}
          </div>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {adding ? "Adding..." : score}
          </span>
          {/* Nothing to edit or delete until the server has it */}
          <div
            className={cn("flex shrink-0 gap-1", adding && "invisible")}
            aria-hidden={adding || undefined}
          >
            {categoryType !== "AGGREGATE" && (
              <Button
                variant="ghost"
                size="iconSm"
                tooltip="Edit nomination"
                aria-label={`Edit ${nomination.name}`}
                onClick={() => setEditing(true)}
              >
                <PencilSimpleIcon />
              </Button>
            )}
            <NominationActions
              nominationId={nomination.id}
              nominationName={nomination.name}
              nominationDescription={nomination.description}
              isImage={isImage}
            />
          </div>
        </div>
      )}
    </li>
  );
}

function EditNominationForm({
  nomination,
  categoryType,
  onDone,
}: {
  nomination: Nomination;
  categoryType: CategoryType;
  onDone: () => void;
}) {
  const isImageCategory = categoryType === "IMAGE";
  const form = useForm<NominationFieldValues>({
    resolver: zodResolver(nominationFieldsSchema),
    defaultValues: {
      name: nomination.name,
      description: nomination.description ?? "",
    },
  });
  const trpc = useTRPC();
  const showChange = useShowChange();
  // The nomination shows its new name and description straight away (an image link as typed,
  // until the server has turned it into the picture's address). The form stays open until the
  // server has saved them, so a refused change keeps what was typed.
  const update = useMutation(
    trpc.award.updateNomination.mutationOptions({
      ...showChange(
        (
          categories,
          values: { id: string; name: string; description?: string },
        ) =>
          updateNomination(categories, values.id, n => ({
            ...n,
            name: values.name,
            description: values.description ?? n.description,
          })),
      ),
      onSuccess: ({ nomination: saved, mergedIn }) => {
        if (mergedIn.length) {
          toast.info(
            `"${saved.name}" now counts together with the other "${saved.name}" in ${mergedIn.join(", ")}`,
          );
        } else {
          toast.success("Nomination updated");
        }
        onDone();
      },
    }),
  );

  const { picture, canSave } = usePicture(
    form,
    isImageCategory,
    nomination.description,
  );

  const onSubmit = (values: NominationFieldValues) => {
    if (!canSave()) return;
    update.mutate({ ...values, id: nomination.id });
  };

  return (
    <InlineEditForm
      form={form}
      onSubmit={onSubmit}
      onCancel={onDone}
      isSaving={update.isPending}
    >
      <NominationFields control={form.control} picture={picture} />
      <p className="text-muted-foreground text-sm">
        Votes for this nomination are kept.
      </p>
    </InlineEditForm>
  );
}
