"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import { useShowEvents } from "~/lib/hooks/useShowEvents";
import { votingHasClosed } from "~/lib/stages";
import { cn } from "~/lib/utils";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

import { ThemeToggle } from "./theme-toggle";
import { type MyVotes, VoteOutcome } from "./vote-parts";
import { VotingInterface } from "./voting-interface";

type Show = RouterOutputs["award"]["getActiveCategory"];

type LiveVotingSessionProps = {
  initialShow: Show;
  /** The voter's votes in the category that was active when the page was rendered */
  initialMyVotes?: {
    categoryId: string;
    votes: MyVotes;
  };
  code: string;
};

/**
 * The voter's phone: the category on the big screen, and their vote in it. It follows the show
 * live, and the phone's light or dark setting (or the voter's pick).
 */
export function LiveVotingSession({
  initialShow,
  initialMyVotes,
  code,
}: LiveVotingSessionProps) {
  const trpc = useTRPC();
  useShowEvents(code, { liveCounts: false, crowd: true });
  const { data: show, error } = useQuery(
    trpc.award.getActiveCategory.queryOptions(
      { code },
      { initialData: initialShow, retry: 3 },
    ),
  );
  // A deleted show (NOT_FOUND) says so on the page instead
  const gone = error?.data?.code === "NOT_FOUND";
  useEffect(() => {
    if (error && !gone) {
      toast.error("Can't get the latest from the show, trying again...");
    }
  }, [error, gone]);

  const category = show.category;
  // The host closes voting before the reveal, and revealing closes it too (the server refuses
  // votes then)
  const closed = !!category && votingHasClosed(category);
  const aggregate = category?.type === "AGGREGATE";

  // The server-rendered votes only describe the first category shown. Drop them once the host
  // moves on, so a category reopened later (and maybe reset meanwhile) never starts from them.
  const [initialVotes, setInitialVotes] = useState(initialMyVotes);
  if (initialVotes && initialVotes.categoryId !== category?.id) {
    setInitialVotes(undefined);
  }

  // The voter's own vote (or ranking) in the category. Its key includes the category, so a vote
  // never shows against the next category while it loads. Only the active category's votes are
  // cached (gcTime: 0): a category the host reopens may have been reset in the meantime. Always
  // reloaded on mount (staleTime: 0): back and forward navigation can restore server-rendered
  // votes that are out of date.
  const myVotesOptions = trpc.award.getMyVotes.queryOptions(
    { categoryId: category?.id ?? "" },
    {
      retry: 3,
      gcTime: 0,
      staleTime: 0,
      // Checked here too: the render that drops them still runs with them
      initialData:
        initialVotes?.categoryId === category?.id
          ? initialVotes?.votes
          : undefined,
      enabled: !!category && !aggregate,
    },
  );
  const { data: myVotes, isError: myVotesFailed } = useQuery(myVotesOptions);
  useEffect(() => {
    if (myVotesFailed) toast.error("Can't check your vote, trying again...");
  }, [myVotesFailed]);

  const reduceMotion = useReducedMotion();
  const status = gone
    ? null
    : !category
      ? { label: "Waiting", live: false }
      : aggregate
        ? { label: "Results next", live: false }
        : closed
          ? { label: "Voting closed", live: false }
          : { label: "Voting is open", live: true };

  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-4">
        <header className="text-muted-foreground flex items-center gap-3 text-sm font-semibold">
          <span>Room {code}</span>
          {status && (
            <span className="ml-auto flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 rounded-full",
                  status.live
                    ? "bg-success ring-success/25 ring-4 motion-safe:animate-pulse"
                    : "bg-border",
                )}
              />
              {status.label}
            </span>
          )}
          <span className={cn(!status && "ml-auto")}>
            <ThemeToggle />
          </span>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            // A new category slides in; its stages change in place
            key={gone ? "gone" : (category?.id ?? "waiting")}
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
          >
            {gone ? (
              <VoteOutcome title="This show has been deleted." anchored={false}>
                Ask the host for the new room code.
              </VoteOutcome>
            ) : !category ? (
              <VoteOutcome title={show.name} anchored={false}>
                <span className="text-foreground mb-2 block text-xl font-semibold">
                  Waiting for the next award.
                </span>
                Keep this page open: it shows the next award as soon as the host
                starts it.
              </VoteOutcome>
            ) : (
              <>
                <div className="mt-4 mb-2">
                  <h1 className="text-3xl leading-[1.12] font-bold text-balance">
                    {category.name}
                  </h1>
                  {category.description && (
                    // The host's own words: in the body voice, not muted like the app's help
                    <p className="text-foreground/90 mt-2 text-lg leading-snug">
                      {category.description}
                    </p>
                  )}
                  {category.aggregateOf.length > 0 && (
                    <p className="text-muted-foreground mt-1.5 text-sm">
                      Counts towards{" "}
                      {category.aggregateOf.map(a => a.name).join(", ")}
                    </p>
                  )}
                </div>
                {aggregate ? (
                  <VoteOutcome title="Nothing to vote for here">
                    This award adds up earlier ones. Watch the big screen for
                    the results.
                  </VoteOutcome>
                ) : (
                  <div className="mt-2 flex flex-1 flex-col">
                    <VotingInterface
                      // A fresh form for each category
                      key={category.id}
                      nominations={category.nominations}
                      categoryId={category.id}
                      categoryType={category.type}
                      rankingTop={category.rankingTop}
                      myVotes={myVotes}
                      myVotesKey={myVotesOptions.queryKey}
                      closed={closed}
                      described={!!category.description}
                    />
                  </div>
                )}
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </main>
  );
}
