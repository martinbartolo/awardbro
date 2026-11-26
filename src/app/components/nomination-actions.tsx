"use client";

import { useMutation } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { isImageUrl } from "~/lib/images";
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
  const router = useRouter();

  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const deleteNomination = useMutation(
    trpc.award.deleteNomination.mutationOptions({
      onSuccess: () => {
        router.refresh();
      },
      onError: onManageError("Failed to delete nomination"),
    }),
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          tooltip="Delete nomination"
          className="h-8 w-8"
          aria-label="Delete nomination"
        >
          <XIcon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete nomination?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{nominationName}&quot;
            {nominationDescription &&
            !isImage &&
            !isImageUrl(nominationDescription)
              ? ` (${nominationDescription})`
              : ""}
            ? This will permanently remove this nomination and all its votes.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteNomination.mutate({ id: nominationId })}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Nomination
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
