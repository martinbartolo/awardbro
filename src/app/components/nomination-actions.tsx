"use client";

import { Button } from "~/components/ui/button";
import { XIcon } from "lucide-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

interface NominationActionsProps {
  nominationId: string;
  nominationName: string;
}

export function NominationActions({ nominationId, nominationName }: NominationActionsProps) {
  const router = useRouter();

  const deleteNomination = api.award.deleteNomination.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to delete nomination");
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" tooltip="Delete nomination" className="h-8 w-8">
          <XIcon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete nomination?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{nominationName}&quot;? This will permanently
            remove this nomination and all its votes. This action cannot be undone.
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
