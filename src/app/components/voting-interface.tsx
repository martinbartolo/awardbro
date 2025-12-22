"use client";

import { useState } from "react";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { type CategoryType } from "~/generated/prisma/enums";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { NominationDescription } from "./nomination-description";
import { RankingInterface } from "./ranking-interface";

export function VotingInterface({
  nominations,
  categoryId,
  categoryType,
  rankingTop,
}: {
  nominations: {
    id: string;
    name: string;
    description?: string | null;
    _count?: { votes: number };
  }[];
  categoryId: string;
  categoryType: CategoryType;
  rankingTop?: number | null;
}) {
  const isAggregate = categoryType === "AGGREGATE";
  const isRanking = categoryType === "RANKING";
  // Track only the user's explicit selection (null = no manual selection yet)
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const router = useRouter();

  // Get the current vote (only for normal/image categories)
  const { data: currentVote } = api.award.getCurrentVote.useQuery(
    { categoryId },
    {
      refetchInterval: 5000,
      enabled: !isAggregate && !isRanking,
    },
  );

  // Derive effective selection: user's choice takes precedence, fall back to current vote
  const selectedNominationId =
    userSelectedId ?? currentVote?.nominationId ?? null;

  // Get the selected nomination for display
  const selectedNomination = selectedNominationId
    ? nominations.find(n => n.id === selectedNominationId)
    : null;

  const vote = api.award.vote.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("Vote cast successfully!");
      // Reset user selection after successful vote so it syncs with server
      setUserSelectedId(null);
    },
    onError: error => {
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

  if (isAggregate) {
    return (
      <p>
        This is an aggregate category that combines votes from multiple
        categories. Voting is not available.
      </p>
    );
  }

  if (isRanking) {
    if (!rankingTop) {
      return (
        <p className="text-destructive">
          This ranking category is not configured properly. Please contact the
          organizer.
        </p>
      );
    }
    return (
      <RankingInterface
        nominations={nominations}
        categoryId={categoryId}
        rankingTop={rankingTop}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <p className="text-muted-foreground text-sm">
        Select your favorite nomination and cast your vote. You can change your
        vote at any time before voting closes.
      </p>

      {/* Current selection slot */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Your Vote:</h3>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-all",
            selectedNomination
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/30 bg-muted/30",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              selectedNomination
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Check className="h-4 w-4" />
          </span>
          {selectedNomination ? (
            <div className="flex flex-1 items-center justify-between gap-2">
              <div>
                <span className="font-medium">{selectedNomination.name}</span>
                {currentVote?.nominationId === selectedNomination.id && (
                  <span className="text-primary ml-2 text-xs">(Submitted)</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">
              Click a nomination below to select your vote
            </span>
          )}
        </div>
      </div>

      {/* Available nominations */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Available Nominations:</h3>
        <div className="space-y-2">
          {nominations.map(nomination => {
            const isSelected = selectedNominationId === nomination.id;
            const isCurrentVote = currentVote?.nominationId === nomination.id;

            return (
              <button
                key={nomination.id}
                onClick={() => setUserSelectedId(nomination.id)}
                className={cn(
                  "w-full text-left transition-all",
                  "rounded-lg p-4",
                  isSelected
                    ? "bg-primary/20 ring-primary ring-2"
                    : "cursor-pointer bg-white/10 hover:bg-white/20",
                  isVoting && "cursor-not-allowed opacity-50",
                )}
                disabled={isVoting}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {nomination.name}
                      {!isSelected && isCurrentVote && (
                        <span className="text-muted-foreground ml-2 text-sm">
                          (Previously voted)
                        </span>
                      )}
                    </div>
                    {nomination.description && (
                      <NominationDescription
                        description={nomination.description}
                        className="text-muted-foreground text-sm wrap-break-word"
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleVote}
        disabled={isVoting || !selectedNominationId}
      >
        {isVoting
          ? "Casting Vote..."
          : currentVote
            ? "Update Vote"
            : selectedNominationId
              ? "Cast Vote"
              : "Select a Nomination"}
      </Button>
    </div>
  );
}
