"use client";

import { useState } from "react";

import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { optimistic } from "~/lib/optimistic";
import { cn, getOrdinal } from "~/lib/utils";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

import { NominationDescription } from "./nomination-description";
import {
  PinnedAction,
  QuietButton,
  Tick,
  tileClass,
  useVoteConfetti,
  VoteOutcome,
} from "./vote-parts";

type Ranking = {
  nominationId: string;
  rank: number;
};

export type MyVotes = RouterOutputs["award"]["getMyVotes"];

/** The voter's saved vote or ranking, owned by `LiveVotingSession` */
export type MyVotesProps = {
  myVotes: MyVotes | undefined;
  /** Its query, which a vote updates straight away, before the server answers (optimistic.ts) */
  myVotesKey: QueryKey;
};

type Nomination = {
  id: string;
  name: string;
  description?: string | null;
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

  // The ranking that counts, best first
  const saved = (myVotes ?? [])
    .filter((v): v is Ranking => v.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map(v => v.nominationId);
  const named = (ids: string[]) =>
    ids.flatMap(id => nominations.filter(n => n.id === id));

  // The ranking being made, before it's sent (null: none started), and whether the voter is
  // changing one already in
  const [order, setOrder] = useState<string[] | null>(null);
  const [changing, setChanging] = useState(false);
  // Once voting closes, drop anything unsent: the voter sees what was counted
  if (closed && (order !== null || changing)) {
    setOrder(null);
    setChanging(false);
  }

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
          setOrder(
            [...rankings]
              .sort((a, b) => a.rank - b.rank)
              .map(r => r.nominationId),
          );
          setChanging(true);
          toast.error(error.message || "Your ranking didn't go in. Try again.");
        },
      }),
    ),
  );

  // A change starts from nothing: the ranking already in stays until a new one is sent
  const current = order ?? [];
  const complete = current.length === rankingTop;
  const unchanged = current.join() === saved.join();
  const toggle = (id: string) =>
    setOrder(
      current.includes(id)
        ? current.filter(other => other !== id)
        : current.length < rankingTop
          ? [...current, id]
          : current,
    );
  const send = () => {
    if (!complete || unchanged) return;
    setOrder(null);
    setChanging(false);
    burst();
    submitRanking.mutate({
      categoryId,
      rankings: current.map((nominationId, i) => ({
        nominationId,
        rank: i + 1,
      })),
    });
  };

  // The ranking as it counts: small tiles with their places, as on the ranking screen
  const rankingList = (ids: string[]) => (
    <ol className="mt-5 w-full max-w-xs space-y-2 text-left">
      {named(ids).map((nomination, i) => (
        <li
          key={nomination.id}
          className="bg-card text-card-foreground shadow-soft flex items-center gap-3 rounded-[16px] px-3 py-2.5"
        >
          <span className="bg-primary text-primary-foreground grid h-8 w-12 shrink-0 place-items-center rounded-full text-sm font-bold">
            {getOrdinal(i + 1)}
          </span>
          <span className="min-w-0 font-semibold break-words">
            {nomination.name}
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      {/* In one place while the form gives way to "Your ranking is in" */}
      {confetti}
      {closed ? (
        <VoteOutcome title="Voting has closed" done={false}>
          {saved.length > 0 ? (
            <>
              Your ranking:
              {rankingList(saved)}
              <p className="mt-4">Watch the big screen for the results.</p>
            </>
          ) : myVotes ? (
            "You didn't rank this one. Watch the big screen for the results."
          ) : (
            "Checking your ranking..."
          )}
        </VoteOutcome>
      ) : saved.length > 0 && !changing ? (
        <VoteOutcome
          title="Your ranking is in"
          action={
            <QuietButton onClick={() => setChanging(true)}>
              Change my ranking
            </QuietButton>
          }
        >
          {rankingList(saved)}
          <p className="mt-4">Watch the big screen for the results.</p>
        </VoteOutcome>
      ) : (
        <>
          <p className="text-muted-foreground mb-5 text-lg leading-snug">
            Tap your top {rankingTop} in order. {getOrdinal(1)} place gets{" "}
            {rankingTop} points.
            {changing && " Your ranking stays until you send a new one."}
            {current.length > 0 && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setOrder([])}
                  className="text-primary font-semibold underline underline-offset-4"
                >
                  Start again
                </button>
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
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl leading-tight font-semibold break-words">
                      {nomination.name}
                    </span>
                    {/* The description tells apart nominations with the same name */}
                    {nomination.description && (
                      <NominationDescription
                        description={nomination.description}
                        className={cn(
                          "mt-1 text-base leading-snug break-words",
                          place
                            ? "text-primary-foreground/85"
                            : "text-muted-foreground",
                        )}
                        imageClassName="relative mt-2 h-24 w-full [&_img]:rounded-[12px]"
                      />
                    )}
                  </span>
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
            disabled={!complete || unchanged}
            onClick={send}
            below={
              changing && saved.length > 0 ? (
                <QuietButton
                  onClick={() => {
                    setOrder(null);
                    setChanging(false);
                  }}
                >
                  Keep my ranking
                </QuietButton>
              ) : undefined
            }
          >
            {!complete
              ? `Pick ${rankingTop - current.length} more`
              : unchanged
                ? "That's your ranking already"
                : `Submit my top ${rankingTop}`}
          </PinnedAction>
        </>
      )}
    </>
  );
}
