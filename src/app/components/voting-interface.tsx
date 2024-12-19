"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { NominationDescription } from "./nomination-description";

export function VotingInterface({
  nominations,
  categoryId,
}: {
  nominations: {
    id: string;
    name: string;
    description?: string | null;
  }[];
  categoryId: string;
}) {
  const [selectedNominationId, setSelectedNominationId] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const router = useRouter();

  // Get the current vote
  const { data: currentVote } = api.award.getCurrentVote.useQuery(
    { categoryId },
    {
      refetchInterval: 5000,
    }
  );

  // Set the selected nomination to the current vote when it loads
  useEffect(() => {
    if (currentVote) {
      setSelectedNominationId(currentVote.nominationId);
    }
  }, [currentVote]);

  const vote = api.award.vote.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("Vote cast successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Error casting vote. Please try again.");
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
    setIsVoting(true);
    vote.mutate({ nominationId: selectedNominationId });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {nominations.map((nomination) => (
          <button
            key={nomination.id}
            onClick={() => setSelectedNominationId(nomination.id)}
            className={cn(
              "w-full text-left transition-colors",
              "rounded-lg p-4",
              selectedNominationId === nomination.id
                ? "bg-primary/20 ring-2 ring-primary"
                : "bg-white/10 hover:bg-white/20",
              isVoting && "cursor-not-allowed opacity-50"
            )}
            disabled={isVoting}
          >
            <div className="font-semibold">
              {nomination.name}
              {currentVote?.nominationId === nomination.id && (
                <span className="ml-2 text-sm text-primary">(Current Vote)</span>
              )}
            </div>
            {nomination.description && (
              <NominationDescription
                description={nomination.description}
                className="text-sm text-muted-foreground break-words"
              />
            )}
          </button>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleVote}
        disabled={isVoting || !selectedNominationId}
      >
        {isVoting
          ? "Casting Vote..."
          : currentVote
            ? "Change Vote"
            : selectedNominationId
              ? "Cast Vote"
              : "Select a Nomination"}
      </Button>
    </div>
  );
}
