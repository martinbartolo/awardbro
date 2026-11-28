"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type CategoryType } from "~/generated/prisma/enums";
import { optimistic } from "~/lib/optimistic";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

import { FittedText } from "./fitted-text";
import { NominationDescription } from "./nomination-description";
import {
  type MyVotes,
  type MyVotesProps,
  RankingInterface,
} from "./ranking-interface";
import {
  PinnedAction,
  QuietButton,
  Tick,
  tileClass,
  useVoteConfetti,
  VoteOutcome,
  YourVote,
} from "./vote-parts";

type Nomination = {
  id: string;
  name: string;
  description?: string | null;
};

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
    return (
      <RankingInterface
        nominations={nominations}
        categoryId={categoryId}
        // A ranking without its number of places can't be voted in (the server refuses it)
        rankingTop={rankingTop ?? 0}
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
  const [confetti, burst] = useVoteConfetti();

  const savedId = myVotes?.[0]?.nominationId ?? null;
  const saved = nominations.find(n => n.id === savedId);
  // The voter's pick before it's sent, and whether they're changing a vote already in
  const [picked, setPicked] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  // Once voting closes, drop anything unsent: the voter sees what was counted
  if (closed && (picked !== null || changing)) {
    setPicked(null);
    setChanging(false);
  }

  // The vote shows as in straight away. If saving fails, the voter is back on their pick, so
  // they can try again.
  const vote = useMutation(
    trpc.award.vote.mutationOptions(
      optimistic<{ nominationId: string }, MyVotes, { message: string }>({
        queryClient,
        queryKey: myVotesKey,
        change: (_before, { nominationId }) => [{ nominationId, rank: null }],
        onError: (error, { nominationId }) => {
          setPicked(nominationId);
          setChanging(true);
          toast.error(error.message || "Your vote didn't go in. Try again.");
        },
      }),
    ),
  );

  // Nothing is picked until the voter taps a tile; while changing, the vote already in is
  // marked on its tile, and only a different pick can be sent
  const choice = nominations.find(n => n.id === picked);
  const isNew = !!choice && choice.id !== savedId;
  const send = () => {
    if (!choice || !isNew) return;
    setPicked(null);
    setChanging(false);
    burst();
    vote.mutate({ nominationId: choice.id });
  };

  // The confetti's canvas stays in one place while the form gives way to "Your vote is in"
  return (
    <>
      {confetti}
      {closed ? (
        <VoteOutcome title="Voting has closed" done={false}>
          {saved ? (
            <>
              You voted for{" "}
              <strong className="text-foreground">{saved.name}</strong>. Watch
              the big screen for the results.
            </>
          ) : myVotes ? (
            "You didn't vote in this one. Watch the big screen for the results."
          ) : (
            "Checking your vote..."
          )}
        </VoteOutcome>
      ) : saved && !changing ? (
        <VoteOutcome
          title="Your vote is in"
          action={
            <QuietButton onClick={() => setChanging(true)}>
              Change my vote
            </QuietButton>
          }
        >
          You voted for{" "}
          <strong className="text-foreground">{saved.name}</strong>. Watch the
          big screen for the results.
        </VoteOutcome>
      ) : (
        <>
          {changing && saved ? (
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
              const isPicked = nomination.id === picked;
              const isYourVote = changing && nomination.id === savedId;
              return (
                <button
                  key={nomination.id}
                  type="button"
                  role="radio"
                  aria-checked={isPicked}
                  onClick={() => setPicked(nomination.id)}
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
                      <span className="px-1">
                        {/* Two lines at most, so the photos stay in step */}
                        <FittedText
                          text={nomination.name}
                          lines={2}
                          className="text-lg leading-tight font-semibold break-words"
                        />
                      </span>
                    </>
                  ) : (
                    <>
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
                              isPicked
                                ? "text-primary-foreground/85"
                                : "text-muted-foreground",
                            )}
                            imageClassName="relative mt-2 h-24 w-full [&_img]:rounded-[12px]"
                          />
                        )}
                      </span>
                      {isYourVote && <YourVote onPicked={isPicked} />}
                      <Tick checked={isPicked} />
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <PinnedAction
            disabled={!isNew}
            onClick={send}
            below={
              changing && saved ? (
                <QuietButton
                  onClick={() => {
                    setPicked(null);
                    setChanging(false);
                  }}
                >
                  Keep my vote
                </QuietButton>
              ) : undefined
            }
          >
            {!choice
              ? changing
                ? "Pick a different one"
                : "Pick a nomination"
              : isNew
                ? `Vote for ${choice.name}`
                : "That's your vote already"}
          </PinnedAction>
        </>
      )}
    </>
  );
}
