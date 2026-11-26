"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, RotateCcw, Trash } from "lucide-react";
import Link from "next/link";
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
import { Button } from "~/components/ui/button";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { useTRPC } from "~/trpc/react";

/** What the host needs to get the show going: the room code voters enter, and the big screen */
export function RunShowCard({ code }: { code: string }) {
  return (
    <section
      aria-labelledby="run-show"
      className="bg-card mb-8 flex flex-col gap-6 rounded-lg p-6 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h2 id="run-show" className="text-muted-foreground text-sm font-medium">
          Room code
        </h2>
        <p className="font-mono text-5xl font-bold tracking-wide">{code}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Voters scan the QR code on the big screen, or enter this code on the
          homepage.
        </p>
      </div>
      <Button asChild size="lg" className="group shrink-0">
        <Link href={`/present/${code}`} target="_blank">
          Open Big Screen
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </Button>
    </section>
  );
}

/** Resetting every vote and deleting the show, kept apart from the everyday controls */
export function DangerZone({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const deleteSession = useMutation(
    trpc.award.deleteSession.mutationOptions({
      onSuccess: () => {
        router.push("/");
        toast.success("Award show deleted successfully");
      },
      onError: onManageError("Failed to delete award show"),
    }),
  );

  const resetAllVotes = useMutation(
    trpc.award.resetAllVotes.mutationOptions({
      onSuccess: () => {
        router.refresh();
        toast.success("All votes have been reset");
      },
      onError: onManageError("Failed to reset votes"),
    }),
  );

  return (
    <section
      aria-labelledby="danger-zone"
      className="border-destructive/40 rounded-lg border p-6"
    >
      <h2
        id="danger-zone"
        className="text-foreground mb-1 text-xl font-semibold"
      >
        Danger zone
      </h2>
      <p className="text-muted-foreground mb-4 text-sm">
        These can&apos;t be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">
              <RotateCcw className="size-4" />
              Reset All Votes
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all votes?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all votes from all categories. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => resetAllVotes.mutate({ sessionId })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Reset All Votes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash className="size-4" />
              Delete Award Show
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete award show?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your award show and all its data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteSession.mutate({ id: sessionId })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Show
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
