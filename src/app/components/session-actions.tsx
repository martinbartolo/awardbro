"use client";

import { Button } from "~/components/ui/button";
import Link from "next/link";
import { ArrowRight, Trash2, RotateCcw, Share2Icon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
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

interface SessionActionsProps {
  slug: string;
  sessionId: string;
}

export function SessionActions({ slug, sessionId }: SessionActionsProps) {
  const router = useRouter();

  const deleteSession = api.award.deleteSession.useMutation({
    onSuccess: () => {
      router.push("/");
      toast.success("Award show deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete award show");
    },
  });

  const resetAllVotes = api.award.resetAllVotes.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("All votes have been reset");
    },
    onError: () => {
      toast.error("Failed to reset votes");
    },
  });

  const copyVotingUrl = () => {
    const votingUrl = `${window.location.origin}/vote/${slug}`;
    void navigator.clipboard.writeText(votingUrl);
    toast.success("URL Copied!", {
      icon: <CopyIcon className="size-4" />,
      description: "The voting URL has been copied to your clipboard.",
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild className="w-full sm:w-auto group">
        <Link href={`/vote/${slug}`} target="_blank">
          Voting
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </Button>

      <Button asChild className="w-full sm:w-auto group">
        <Link href={`/present/${slug}`} target="_blank">
          Presentation
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={copyVotingUrl}
        tooltip="Share Voting URL"
        aria-label="Share Voting URL"
      >
        <Share2Icon className="size-4" />
      </Button>

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
              This will remove all votes from all categories. This action cannot be undone.
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
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete award show?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your award show and all its data. This action cannot be
              undone.
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
  );
}
