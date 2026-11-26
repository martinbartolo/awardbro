"use client";

import { useMemo, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { cn, getOrdinal, isSameRanking } from "~/lib/utils";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

import { NominationDescription } from "./nomination-description";

type Ranking = {
  nominationId: string;
  rank: number;
};

export type MyVotes = RouterOutputs["award"]["getMyVotes"];

/** The voter's saved vote or ranking, owned by `LiveVotingSession` */
export type MyVotesProps = {
  myVotes: MyVotes | undefined;
  /** Reloads `myVotes`, resolving to the reloaded data (undefined on failure) */
  refetchMyVotes: () => Promise<MyVotes | undefined>;
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
  myVotes: currentRankings,
  refetchMyVotes,
  closed,
}: {
  nominations: Nomination[];
  categoryId: string;
  rankingTop: number;
  /** Voting has closed: show the voter's ranking without the form */
  closed: boolean;
} & MyVotesProps) {
  // Track user modifications separately - null means use server data
  const [userRankings, setUserRankings] = useState<Ranking[] | null>(null);
  const trpc = useTRPC();

  // Derive rankings from server data or user modifications
  const rankings = useMemo(() => {
    // If user has made modifications, use those
    if (userRankings !== null) {
      return userRankings;
    }
    // Otherwise derive from server data
    return (currentRankings ?? [])
      .filter(v => v.rank !== null)
      .map(v => ({
        nominationId: v.nominationId,
        rank: v.rank!,
      }))
      .sort((a, b) => a.rank - b.rank);
  }, [currentRankings, userRankings]);

  // Drop an unsaved ranking once voting closes, so the voter sees what was
  // counted, and reopening starts from it
  if (closed && userRankings !== null) setUserRankings(null);

  const setRankings = (newRankings: Ranking[]) => {
    setUserRankings(newRankings);
  };

  const submitRanking = useMutation(
    trpc.award.submitRanking.mutationOptions({
      onSuccess: async (_data, { rankings: submitted }) => {
        toast.success("Rankings submitted successfully!");
        // Load the submitted ranking before dropping the local one, so the
        // form never looks empty in between (the query only polls every 5 s).
        // If loading it fails, keep the local ranking until the next poll.
        const saved = await refetchMyVotes();
        if (saved && isSameRanking(saved, submitted)) setUserRankings(null);
      },
      onError: error => {
        toast.error(
          error.message || "Error submitting rankings. Please try again.",
        );
      },
    }),
  );
  const isSubmitting = submitRanking.isPending;

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

  const hasExistingRankings = !!currentRankings?.length;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <p className="text-muted-foreground text-sm">
        {closed ? (
          "Watch the big screen for the results."
        ) : (
          <>
            Rank your top {rankingTop} choices. {getOrdinal(1)} place gets{" "}
            {rankingTop} points, {getOrdinal(2)} place gets {rankingTop - 1}{" "}
            points, etc.
          </>
        )}
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
                  {/* The description tells apart nominations with the same name */}
                  <div className="min-w-0">
                    <span className="font-medium">{slot.nomination.name}</span>
                    <NominationDescription
                      description={slot.nomination.description ?? null}
                      className="text-muted-foreground line-clamp-1 text-xs"
                      imageClassName="relative mt-1 h-10 w-16"
                    />
                  </div>
                  {!closed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRanking(slot.nomination!.id)}
                      disabled={isSubmitting}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {!closed
                    ? `Click a nomination below to assign ${getOrdinal(slot.rank)} place`
                    : currentRankings
                      ? "Not ranked"
                      : "Checking your ranking..."}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {!closed && (
        <>
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
        </>
      )}
    </div>
  );
}
