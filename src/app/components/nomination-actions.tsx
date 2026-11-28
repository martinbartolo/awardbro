"use client";

import { XIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";

import { ConfirmButton } from "~/app/components/confirm-button";
import { Button } from "~/components/ui/button";
import { useShowChange } from "~/lib/hooks/useShowChange";
import { isImageUrl } from "~/lib/images";
import { withoutNomination } from "~/lib/show-changes";
import { useTRPC } from "~/trpc/react";

type NominationActionsProps = {
  nominationId: string;
  nominationName: string;
  /** Shown in the confirmation when it's text, to tell apart nominations with the same name */
  nominationDescription?: string | null;
  /** Whether its category shows pictures, so the description is a picture link */
  isImage?: boolean;
};

export function NominationActions({
  nominationId,
  nominationName,
  nominationDescription,
  isImage = false,
}: NominationActionsProps) {
  const trpc = useTRPC();
  const showChange = useShowChange();
  // Gone straight away (its aggregates' copies follow once the server has answered)
  const deleteNomination = useMutation(
    trpc.award.deleteNomination.mutationOptions(
      showChange(
        (categories, { id }: { id: string }) =>
          withoutNomination(categories, id),
        "Failed to delete nomination",
      ),
    ),
  );

  return (
    <ConfirmButton
      title="Delete nomination?"
      description={
        <>
          Are you sure you want to delete &quot;{nominationName}&quot;
          {nominationDescription &&
          !isImage &&
          !isImageUrl(nominationDescription)
            ? ` (${nominationDescription})`
            : ""}
          ? This will permanently remove this nomination and all its votes. This
          action cannot be undone.
        </>
      }
      confirmLabel="Delete Nomination"
      onConfirm={() => deleteNomination.mutate({ id: nominationId })}
    >
      <Button
        variant="ghost"
        size="icon"
        tooltip="Delete nomination"
        className="hover:text-destructive h-8 w-8"
        aria-label="Delete nomination"
      >
        <XIcon />
      </Button>
    </ConfirmButton>
  );
}
