"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  InlineEditForm,
  useCloseAfterRefresh,
} from "~/app/components/inline-edit-form";
import { NominationActions } from "~/app/components/nomination-actions";
import { NominationDescription } from "~/app/components/nomination-description";
import {
  NominationFields,
  usePicture,
} from "~/app/components/nomination-fields";
import { Button } from "~/components/ui/button";
import { type CategoryType } from "~/generated/prisma/enums";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import {
  nominationFieldsSchema,
  type NominationFieldValues,
} from "~/lib/schemas";
import { useTRPC } from "~/trpc/react";

type Nomination = { id: string; name: string; description: string | null };

/**
 * A nomination on the manage page: its name, description and score, with buttons to edit it in
 * place or delete it. Nominations of an aggregate are copies of its sources', so they can't be
 * edited there.
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

  return (
    <div className="bg-secondary hover:bg-secondary/80 rounded-lg p-4 transition-colors">
      {editing ? (
        <EditNominationForm
          nomination={nomination}
          categoryType={categoryType}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-secondary-foreground font-semibold">
              {nomination.name}
            </div>
            <NominationDescription
              description={nomination.description}
              isImage={isImage}
              className="text-muted-foreground mt-1 text-sm"
              imageClassName="mt-1 h-48"
            />
            <div className="text-accent mt-2 text-sm">{score}</div>
          </div>
          <div className="flex shrink-0 gap-1">
            {categoryType !== "AGGREGATE" && (
              <Button
                variant="ghost"
                size="iconSm"
                tooltip="Edit nomination"
                aria-label={`Edit ${nomination.name}`}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
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
    </div>
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
  const { close, isRefreshing } = useCloseAfterRefresh(onDone);

  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const update = useMutation(
    trpc.award.updateNomination.mutationOptions({
      onSuccess: ({ nomination: saved, mergedIn }) => {
        if (mergedIn.length) {
          toast.info(
            `"${saved.name}" now counts together with the other "${saved.name}" in ${mergedIn.join(", ")}`,
          );
        } else {
          toast.success("Nomination updated");
        }
        close();
      },
      onError: onManageError(),
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
      isSaving={update.isPending || isRefreshing}
    >
      <NominationFields control={form.control} picture={picture} />
      <p className="text-muted-foreground text-sm">
        Votes for this nomination are kept.
      </p>
    </InlineEditForm>
  );
}
