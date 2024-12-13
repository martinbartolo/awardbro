'use client';

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function VoteButton({
  nominationId,
  hasVoted,
}: {
  nominationId: string;
  hasVoted: boolean;
}) {
  const [isVoting, setIsVoting] = useState(false);
  const router = useRouter();

  const vote = api.award.vote.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("Vote cast successfully!");
    },
    onError: (error) => {
      if (error.message === "Already voted in this category") {
        toast.error("You have already voted in this category");
        router.refresh(); // Refresh to update UI state
      } else {
        toast.error("Error casting vote. Please try again.");
      }
    },
    onSettled: () => {
      setIsVoting(false);
    },
  });

  return (
    <Button
      onClick={() => {
        if (hasVoted) {
          toast.error("You have already voted in this category");
          return;
        }
        setIsVoting(true);
        vote.mutate({ nominationId });
      }}
      disabled={isVoting || hasVoted}
      variant={hasVoted ? "secondary" : "default"}
      title={hasVoted ? "You can only vote once per category" : "Cast your vote"}
    >
      {hasVoted ? "Already Voted" : "Vote"}
    </Button>
  );
} 