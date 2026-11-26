"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Copy, CopyIcon, RotateCcw, Trash } from "lucide-react";
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

type SessionActionsProps = {
  code: string;
  sessionId: string;
};

export function SessionActions({ code, sessionId }: SessionActionsProps) {
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

  const copyVotingUrl = () => {
    const votingUrl = `${window.location.origin}/vote/${code}`;
    void navigator.clipboard.writeText(votingUrl);
    toast.success("URL Copied!", {
      icon: <CopyIcon className="size-4" />,
      description: "The voting URL has been copied to your clipboard.",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Primary Actions */}
      <div className="flex w-full gap-2 sm:w-auto">
        <Button onClick={copyVotingUrl} className="flex-1 sm:flex-none">
          <Copy className="size-4" />
          Copy Voting Link
        </Button>

        <Button asChild className="group flex-1 sm:flex-none">
          <Link href={`/present/${code}`} target="_blank">
            Presentation
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              tooltip="Reset All Votes"
              aria-label="Reset All Votes"
            >
              <RotateCcw className="size-4" />
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
            <Button
              variant="destructive"
              size="icon"
              tooltip="Delete Award Show"
              aria-label="Delete Award Show"
            >
              <Trash className="size-4" />
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
    </div>
  );
}
