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
}: {
  nominations: Nomination[];
  categoryId: string;
  categoryType: CategoryType;
  rankingTop?: number | null;
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
      myVotes={myVotes}
      myVotesKey={myVotesKey}
      closed={closed}
    />
  );
}

function PickOne({
  nominations,
  pictures,
  myVotes,
  myVotesKey,
  closed,
}: {
  nominations: Nomination[];
  pictures: boolean;
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

  const choiceId = picked ?? savedId;
  const choice = nominations.find(n => n.id === choiceId);
  const send = () => {
    if (!choice) return;
    setPicked(null);
    setChanging(false);
    // Picking the vote already in changes nothing
    if (choice.id === savedId) return;
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
          <p className="text-muted-foreground mb-5 text-lg leading-snug">
            {changing && saved
              ? `Pick again. Your vote for ${saved.name} stays until you vote.`
              : "Pick one. You can change it until voting closes."}
          </p>
          <div
            role="radiogroup"
            aria-label="Nominations"
            className={cn("grid gap-3", pictures && "grid-cols-2")}
          >
            {nominations.map(nomination => {
              const isPicked = nomination.id === choiceId;
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
                      <NominationDescription
                        description={nomination.description ?? null}
                        isImage
                        imageClassName="relative aspect-square w-full [&_img]:size-full [&_img]:rounded-[14px] [&_img]:object-cover"
                      />
                      <span className="flex items-center gap-2 px-1">
                        <span className="min-w-0 flex-1">
                          {/* Two lines at most, so the photos stay in step */}
                          <FittedText
                            text={nomination.name}
                            lines={2}
                            className="text-lg leading-tight font-semibold break-words"
                          />
                        </span>
                        <Tick checked={isPicked} />
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
                      <Tick checked={isPicked} />
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <PinnedAction
            disabled={!choice}
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
            {choice ? `Vote for ${choice.name}` : "Pick a nomination"}
          </PinnedAction>
        </>
      )}
    </>
  );
}
