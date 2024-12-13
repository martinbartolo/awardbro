'use client';

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

export function VotingInterface({
  nominations,
  hasVoted,
}: {
  nominations: {
    id: string;
    name: string;
    description?: string | null;
  }[];
  hasVoted: boolean;
}) {
  const [selectedNominationId, setSelectedNominationId] = useState<string | null>(null);
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

  const handleVote = () => {
    if (!selectedNominationId) {
      toast.error("Please select a nomination first");
      return;
    }
    if (hasVoted) {
      toast.error("You have already voted in this category");
      return;
    }
    setIsVoting(true);
    vote.mutate({ nominationId: selectedNominationId });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {nominations.map((nomination) => (
          <button
            key={nomination.id}
            onClick={() => !hasVoted && setSelectedNominationId(nomination.id)}
            className={cn(
              "w-full text-left transition-colors",
              "rounded-lg p-4",
              selectedNominationId === nomination.id
                ? "bg-primary/20 ring-2 ring-primary"
                : "bg-white/10 hover:bg-white/20",
              hasVoted && "cursor-not-allowed opacity-50"
            )}
            disabled={hasVoted}
          >
            <div className="font-semibold">{nomination.name}</div>
            {nomination.description && (
              <div className="text-sm text-gray-400">{nomination.description}</div>
            )}
          </button>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleVote}
        disabled={isVoting || hasVoted || !selectedNominationId}
      >
        {hasVoted
          ? "Already Voted"
          : isVoting
          ? "Casting Vote..."
          : selectedNominationId
          ? "Cast Vote"
          : "Select a Nomination"}
      </Button>
    </div>
  );
}