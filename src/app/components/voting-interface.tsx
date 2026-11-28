"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type CategoryType } from "~/generated/prisma/enums";
import { optimistic } from "~/lib/optimistic";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

import { NominationDescription } from "./nomination-description";
import { RankingInterface } from "./ranking-interface";
import {
  type MyVotes,
  type MyVotesProps,
  type Nomination,
  PinnedAction,
  QuietButton,
  Tick,
  tileClass,
  TileText,
  VoteOutcome,
  VoteStages,
  YourVote,
} from "./vote-parts";

/**
 * Voting in the category on the big screen: one pick in a normal or image category, or a ranking.
 * The voter taps a nomination, then the pinned button that names it. Once the vote is in, they
 * see so, with a way to change it until voting closes.
 */
export function VotingInterface({
  nominations,
  categoryId,
  categoryType,
  rankingTop,
  myVotes,
  myVotesKey,
  closed,
  described = false,
}: {
  nominations: Nomination[];
  categoryId: string;
  categoryType: CategoryType;
  rankingTop?: number | null;
  /** The category has a description under its name, which says enough for a single pick */
  described?: boolean;
  /** Voting has closed: show the voter's vote without the form */
  closed: boolean;
} & MyVotesProps) {
  if (categoryType === "RANKING") {
    // A ranking without its number of places can't be voted in (the server refuses it)
    if (!rankingTop) {
      return (
        <VoteOutcome title="This ranking isn't ready">
          The host needs to say how many places to rank. Watch the big screen.
        </VoteOutcome>
      );
    }
    return (
      <RankingInterface
        nominations={nominations}
        categoryId={categoryId}
        rankingTop={rankingTop}
        myVotes={myVotes}
        myVotesKey={myVotesKey}
        closed={closed}
      />
    );
  }
  return (
    <PickOne
      nominations={nominations}
      pictures={categoryType === "IMAGE"}
      described={described}
      myVotes={myVotes}
      myVotesKey={myVotesKey}
      closed={closed}
    />
  );
}

function PickOne({
  nominations,
  pictures,
  described,
  myVotes,
  myVotesKey,
  closed,
}: {
  nominations: Nomination[];
  pictures: boolean;
  described: boolean;
  closed: boolean;
} & MyVotesProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const savedId = myVotes?.[0]?.nominationId ?? null;
  const saved = nominations.find(n => n.id === savedId);
  // The voter picking, before it's sent: null when they're not (the vote in shows instead).
  // Nothing is picked until they tap a tile.
  const [draft, setDraft] = useState<{ id: string | null } | null>(null);
  // Once voting closes, drop anything unsent: the voter sees what was counted
  if (closed && draft) setDraft(null);
  const changing = !!draft && !!saved;

  // The vote shows as in straight away. If saving fails, the voter is back on their pick, so
  // they can try again.
  const vote = useMutation(
    trpc.award.vote.mutationOptions(
      optimistic<{ nominationId: string }, MyVotes, { message: string }>({
        queryClient,
        queryKey: myVotesKey,
        change: (_before, { nominationId }) => [{ nominationId, rank: null }],
        onError: (error, { nominationId }) => {
          // Unless they've started picking again meanwhile: that pick stays
          setDraft(current => current ?? { id: nominationId });
          toast.error(error.message || "Your vote didn't go in. Try again.");
        },
      }),
    ),
  );

  // Only a pick different from the vote already in can be sent
  const choice = nominations.find(n => n.id === draft?.id);
  const isNew = !!choice && choice.id !== savedId;
  // One vote on its way at a time, so the last one sent is the one that counts
  const sending = vote.isPending;
  const send = () => {
    if (!choice || !isNew || sending) return;
    setDraft(null);
    vote.mutate({ nominationId: choice.id });
  };
  const label = () => {
    if (sending) return "Saving your last vote...";
    if (!choice) return changing ? "Pick a different one" : "Pick a nomination";
    return isNew ? `Vote for ${choice.name}` : "That's your vote already";
  };

  return (
    <VoteStages
      noun="vote"
      summary={
        saved && (
          <p>
            You voted for{" "}
            <strong className="text-foreground">{saved.name}</strong>.
          </p>
        )
      }
      loaded={!!myVotes}
      closed={closed}
      editing={!!draft}
      onChange={() => setDraft({ id: null })}
    >
      {changing ? (
        <p className="text-muted-foreground mb-5 text-lg leading-snug">
          Your vote for {saved.name} stays until you pick another.
        </p>
      ) : (
        // The host's description under the heading says enough on its own
        !described && (
          <p className="text-muted-foreground mb-5 text-lg leading-snug">
            Pick one. You can change it until voting closes.
          </p>
        )
      )}
      <div
        role="radiogroup"
        aria-label="Nominations"
        className={cn("grid gap-3", pictures && "grid-cols-2")}
      >
        {nominations.map(nomination => {
          const isPicked = nomination.id === draft?.id;
          const isYourVote = changing && nomination.id === savedId;
          return (
            <button
              key={nomination.id}
              type="button"
              role="radio"
              aria-checked={isPicked}
              onClick={() => setDraft({ id: nomination.id })}
              className={cn(
                tileClass(isPicked),
                pictures
                  ? "flex flex-col gap-2 p-2 pb-3"
                  : "flex min-h-16 items-center gap-4 px-[18px] py-3",
              )}
            >
              {pictures ? (
                <>
                  <span className="relative block">
                    <NominationDescription
                      description={nomination.description ?? null}
                      isImage
                      imageClassName="relative aspect-square w-full [&_img]:size-full [&_img]:rounded-[14px] [&_img]:object-cover"
                    />
                    {/* On the photo's corner, so the name below gets the tile's width */}
                    <span
                      className={cn(
                        "shadow-soft absolute top-2 right-2 rounded-full p-1",
                        isPicked ? "bg-primary" : "bg-card",
                      )}
                    >
                      <Tick checked={isPicked} />
                    </span>
                    {isYourVote && (
                      <span className="absolute top-2.5 left-2.5">
                        <YourVote onPicked={isPicked} />
                      </span>
                    )}
                  </span>
                  {/* Two lines at most, so the photos stay in step (left-aligned, so CSS
                        clamping draws its "…" in full) */}
                  <span className="line-clamp-2 px-1 text-lg leading-tight font-semibold break-words">
                    {nomination.name}
                  </span>
                </>
              ) : (
                <>
                  <TileText nomination={nomination} picked={isPicked} />
                  {isYourVote && <YourVote onPicked={isPicked} />}
                  <Tick checked={isPicked} />
                </>
              )}
            </button>
          );
        })}
      </div>
      <PinnedAction
        disabled={!isNew || sending}
        onClick={send}
        below={
          changing && (
            <QuietButton onClick={() => setDraft(null)}>
              Keep my vote
            </QuietButton>
          )
        }
      >
        {label()}
      </PinnedAction>
    </VoteStages>
  );
}
