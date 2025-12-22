"use client";

import { useMemo, useState } from "react";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { cn, getOrdinal } from "~/lib/utils";
import { api } from "~/trpc/react";

import { NominationDescription } from "./nomination-description";

type Ranking = {
  nominationId: string;
  rank: number;
};

type Nomination = {
  id: string;
  name: string;
  description?: string | null;
};

export function RankingInterface({
  nominations,
  categoryId,
  rankingTop,
}: {
  nominations: Nomination[];
  categoryId: string;
  rankingTop: number;
}) {
  // Track user modifications separately - null means use server data
  const [userRankings, setUserRankings] = useState<Ranking[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Get existing rankings
  const { data: currentRankings } = api.award.getCurrentRankings.useQuery(
    { categoryId },
    {
      refetchInterval: 5000,
    },
  );

  // Derive rankings from server data or user modifications
  const rankings = useMemo(() => {
    // If user has made modifications, use those
    if (userRankings !== null) {
      return userRankings;
    }
    // Otherwise derive from server data
    if (currentRankings && currentRankings.length > 0) {
      return currentRankings
        .filter(v => v.rank !== null)
        .map(v => ({
          nominationId: v.nominationId,
          rank: v.rank!,
        }))
        .sort((a, b) => a.rank - b.rank);
    }
    return [];
  }, [currentRankings, userRankings]);

  const setRankings = (newRankings: Ranking[]) => {
    setUserRankings(newRankings);
  };

  const submitRanking = api.award.submitRanking.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("Rankings submitted successfully!");
      setUserRankings(null); // Reset to sync with server
    },
    onError: error => {
      toast.error(
        error.message || "Error submitting rankings. Please try again.",
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleAddRanking = (nominationId: string) => {
    if (rankings.length >= rankingTop) return;
    if (rankings.some(r => r.nominationId === nominationId)) return;

    const nextRank = rankings.length + 1;
    setRankings([...rankings, { nominationId, rank: nextRank }]);
  };

  const handleRemoveRanking = (nominationId: string) => {
    const filtered = rankings.filter(r => r.nominationId !== nominationId);
    // Re-number ranks
    const renumbered = filtered.map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
    setRankings(renumbered);
  };

  const handleSubmit = () => {
    if (rankings.length !== rankingTop) {
      toast.error(`Please rank exactly ${rankingTop} nominations`);
      return;
    }
    setIsSubmitting(true);
    submitRanking.mutate({ categoryId, rankings });
  };

  const isComplete = rankings.length === rankingTop;
  const rankedNominationIds = new Set(rankings.map(r => r.nominationId));

  // Create slots for visual display
  const slots = Array.from({ length: rankingTop }, (_, i) => {
    const ranking = rankings.find(r => r.rank === i + 1);
    const nomination = ranking
      ? nominations.find(n => n.id === ranking.nominationId)
      : null;
    return { rank: i + 1, nomination };
  });

  const hasExistingRankings = currentRankings && currentRankings.length > 0;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <p className="text-muted-foreground text-sm">
        Rank your top {rankingTop} choices. {getOrdinal(1)} place gets{" "}
        {rankingTop} points, {getOrdinal(2)} place gets {rankingTop - 1} points,
        etc.
      </p>

      {/* Ranking slots */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Your Rankings:</h3>
        <div className="grid gap-2">
          {slots.map(slot => (
            <div
              key={slot.rank}
              className={cn(
                "flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-all",
                slot.nomination
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/30 bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  slot.nomination
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {slot.rank}
              </span>
              {slot.nomination ? (
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className="font-medium">{slot.nomination.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRanking(slot.nomination!.id)}
                    disabled={isSubmitting}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">
                  Click a nomination below to assign {getOrdinal(slot.rank)}{" "}
                  place
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Available nominations */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Available Nominations:</h3>
        <div className="space-y-2">
          {nominations.map(nomination => {
            const isRanked = rankedNominationIds.has(nomination.id);
            const currentRank = rankings.find(
              r => r.nominationId === nomination.id,
            )?.rank;

            return (
              <button
                key={nomination.id}
                onClick={() => !isRanked && handleAddRanking(nomination.id)}
                disabled={isSubmitting || (isComplete && !isRanked)}
                className={cn(
                  "w-full text-left transition-all",
                  "rounded-lg p-4",
                  isRanked
                    ? "bg-primary/20 ring-primary opacity-60 ring-2"
                    : isComplete
                      ? "cursor-not-allowed bg-white/5 opacity-40"
                      : "cursor-pointer bg-white/10 hover:bg-white/20",
                  isSubmitting && "cursor-not-allowed opacity-50",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {nomination.name}
                      {isRanked && (
                        <span className="text-primary ml-2 text-sm">
                          (Ranked {getOrdinal(currentRank!)})
                        </span>
                      )}
                    </div>
                    {nomination.description && (
                      <NominationDescription
                        description={nomination.description}
                        className="text-muted-foreground text-sm"
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
        onClick={handleSubmit}
        disabled={isSubmitting || !isComplete}
      >
        {isSubmitting
          ? "Submitting Rankings..."
          : hasExistingRankings
            ? "Update Rankings"
            : isComplete
              ? "Submit Rankings"
              : `Select ${rankingTop - rankings.length} more`}
      </Button>
    </div>
  );
}
