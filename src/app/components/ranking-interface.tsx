"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { optimistic } from "~/lib/optimistic";
import { cn, getOrdinal } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

import {
  type MyVotes,
  type MyVotesProps,
  type Nomination,
  PinnedAction,
  QuietButton,
  Tick,
  tileClass,
  TileText,
  useVoteConfetti,
  VoteStages,
} from "./vote-parts";

type Ranking = {
  nominationId: string;
  rank: number;
};

/**
 * Ranking the top N: the voter taps nominations in order, each tapped tile showing its place,
 * and taps one again to take it out. The pinned button sends the ranking once it's complete.
 */
export function RankingInterface({
  nominations,
  categoryId,
  rankingTop,
  myVotes,
  myVotesKey,
  closed,
}: {
  nominations: Nomination[];
  categoryId: string;
  rankingTop: number;
  /** Voting has closed: show the voter's ranking without the form */
  closed: boolean;
} & MyVotesProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confetti, burst] = useVoteConfetti();

  // The ranking that counts, best first, each with its place as it was sent (a nomination the
  // host has deleted since is gone from it, and the others keep their places)
  const ranked = (myVotes ?? [])
    .filter((v): v is Ranking => v.rank !== null)
    .sort((a, b) => a.rank - b.rank);
  const saved = ranked.map(v => v.nominationId);
  const placed = ranked.flatMap(({ nominationId, rank }) => {
    const nomination = nominations.find(n => n.id === nominationId);
    return nomination ? [{ nomination, rank }] : [];
  });

  // The ranking being made, before it's sent: null when the voter isn't making one (the ranking
  // in shows instead). A change starts from nothing.
  const [order, setOrder] = useState<string[] | null>(null);
  // Once voting closes, drop anything unsent: the voter sees what was counted
  if (closed && order) setOrder(null);
  const changing = !!order && saved.length > 0;

  // The ranking shows as in straight away. If saving fails, the voter is back on their
  // ranking, so they can try again.
  const submitRanking = useMutation(
    trpc.award.submitRanking.mutationOptions(
      optimistic<{ rankings: Ranking[] }, MyVotes, { message: string }>({
        queryClient,
        queryKey: myVotesKey,
        change: (_before, { rankings }) =>
          [...rankings].sort((a, b) => a.rank - b.rank),
        onError: (error, { rankings }) => {
          // Unless they've started a new ranking meanwhile: that one stays
          setOrder(
            current =>
              current ??
              [...rankings]
                .sort((a, b) => a.rank - b.rank)
                .map(r => r.nominationId),
          );
          toast.error(error.message || "Your ranking didn't go in. Try again.");
        },
      }),
    ),
  );

  const current = order ?? [];
  const complete = current.length === rankingTop;
  // The same ranking as the one in changes nothing
  const unchanged = current.join() === saved.join();
  const toggle = (id: string) =>
    setOrder(
      current.includes(id)
        ? current.filter(other => other !== id)
        : current.length < rankingTop
          ? [...current, id]
          : current,
    );
  // One ranking on its way at a time, so the last one sent is the one that counts
  const sending = submitRanking.isPending;
  const send = () => {
    if (!complete || unchanged || sending) return;
    setOrder(null);
    burst();
    submitRanking.mutate({
      categoryId,
      rankings: current.map((nominationId, i) => ({
        nominationId,
        rank: i + 1,
      })),
    });
  };
  const label = () => {
    if (sending) return "Saving your last ranking...";
    if (!complete) return `Pick ${rankingTop - current.length} more`;
    return unchanged
      ? "That's your ranking already"
      : `Submit my top ${rankingTop}`;
  };

  return (
    <>
      {/* In one place while the form gives way to "Your ranking is in" */}
      {confetti}
      <VoteStages
        noun="ranking"
        summary={
          placed.length > 0 && (
            // The ranking as it counts: small tiles with their places, as on the ranking screen
            <ol className="w-full space-y-2 text-left">
              {placed.map(({ nomination, rank }) => (
                <li
                  key={nomination.id}
                  className="bg-card text-card-foreground shadow-soft flex items-center gap-3 rounded-[16px] px-3 py-2.5"
                >
                  {/* One width for every place, so the names line up */}
                  <span className="bg-primary text-primary-foreground grid h-8 w-12 shrink-0 place-items-center rounded-full text-sm font-bold">
                    {getOrdinal(rank)}
                  </span>
                  <span className="min-w-0 font-semibold break-words">
                    {nomination.name}
                  </span>
                </li>
              ))}
            </ol>
          )
        }
        loaded={!!myVotes}
        closed={closed}
        editing={!!order}
        onChange={() => setOrder([])}
      >
        <p className="text-muted-foreground mb-5 text-lg leading-snug">
          Tap your top {rankingTop} in order. {getOrdinal(1)} place gets{" "}
          {rankingTop} points.
          {changing && " Your ranking stays until you send a new one."}
          {current.length > 0 && (
            <>
              {" "}
              <QuietButton
                onClick={() => setOrder([])}
                className="px-0 py-0 text-[length:inherit]"
              >
                Start again
              </QuietButton>
            </>
          )}
        </p>
        <div className="grid gap-3">
          {nominations.map(nomination => {
            const place = current.indexOf(nomination.id) + 1;
            const full = complete && !place;
            return (
              <button
                key={nomination.id}
                type="button"
                aria-pressed={place > 0}
                disabled={full}
                onClick={() => toggle(nomination.id)}
                className={cn(
                  tileClass(place > 0, full),
                  "flex min-h-16 items-center gap-4 px-[18px] py-3",
                )}
              >
                <TileText nomination={nomination} picked={place > 0} />
                {place ? (
                  // One width for every place, so the badges line up
                  <span className="bg-primary-foreground text-primary grid h-9 w-13 shrink-0 place-items-center rounded-full text-base font-bold">
                    {getOrdinal(place)}
                  </span>
                ) : (
                  // Not placed yet: the same ring as a single pick's tiles
                  <Tick checked={false} />
                )}
              </button>
            );
          })}
        </div>
        <PinnedAction
          disabled={!complete || unchanged || sending}
          onClick={send}
          below={
            changing && (
              <QuietButton onClick={() => setOrder(null)}>
                Keep my ranking
              </QuietButton>
            )
          }
        >
          {label()}
        </PinnedAction>
      </VoteStages>
    </>
  );
}
