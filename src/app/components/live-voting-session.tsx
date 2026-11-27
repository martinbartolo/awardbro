"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { CircleExclamationPoint } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useShowEvents } from "~/lib/hooks/useShowEvents";
import { votingHasClosed } from "~/lib/stages";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

import { type MyVotes } from "./ranking-interface";
import { VotingInterface } from "./voting-interface";

type Session = RouterOutputs["award"]["getSession"];

type LiveVotingSessionProps = {
  initialSession: Session;
  /** The voter's votes in the category that was active when the page was rendered */
  initialMyVotes?: {
    categoryId: string;
    votes: MyVotes;
  };
  code: string;
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 },
  },
};

export function LiveVotingSession({
  initialSession,
  initialMyVotes,
  code,
}: LiveVotingSessionProps) {
  const trpc = useTRPC();
  useShowEvents(code, { liveCounts: false, crowd: true });
  const {
    data: session,
    error: sessionError,
    isError: isSessionError,
  } = useQuery(
    trpc.award.getSession.queryOptions(
      { code, activeOnly: true },
      {
        initialData: initialSession,
        retry: 3,
      },
    ),
  );

  const activeCategory = session.categories[0];
  // The host closes voting before the reveal, and revealing closes it too (the server refuses
  // votes then)
  const isClosed = !!activeCategory && votingHasClosed(activeCategory);

  // The server-rendered votes only describe the first category shown. Drop
  // them once the host moves on, so a category reopened later (and maybe
  // reset meanwhile) never starts from them.
  const [initialVotes, setInitialVotes] = useState(initialMyVotes);
  if (initialVotes && initialVotes.categoryId !== activeCategory?.id) {
    setInitialVotes(undefined);
  }

  // The voter's own vote (or ranking) in the active category. Its key includes
  // the category, so the "already voted" banner never shows another
  // category's answer while the next one loads. Only the active category's
  // votes are cached (gcTime: 0): a category the host reopens may have been
  // reset in the meantime. Always reloaded on mount (staleTime: 0): back and
  // forward navigation can restore server-rendered votes that are out of date.
  const myVotesOptions = trpc.award.getMyVotes.queryOptions(
    { categoryId: activeCategory?.id ?? "" },
    {
      retry: 3,
      gcTime: 0,
      staleTime: 0,
      // Checked here too: the render that drops them still runs with them
      initialData:
        initialVotes?.categoryId === activeCategory?.id
          ? initialVotes?.votes
          : undefined,
      enabled: !!activeCategory && activeCategory.type !== "AGGREGATE",
    },
  );
  const {
    data: myVotes,
    error: voteError,
    isError: isVoteError,
  } = useQuery(myVotesOptions);
  const hasVoted = !!myVotes?.length;
  useEffect(() => {
    if (isSessionError) {
      toast.error("Failed to fetch session updates");
    }
  }, [isSessionError]);

  useEffect(() => {
    if (isVoteError) {
      toast.error("Failed to check voting status");
    }
  }, [isVoteError]);

  if (isSessionError) {
    return (
      <motion.div
        className="container mx-auto px-4 py-8"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
      >
        <Alert variant="destructive">
          <CircleExclamationPoint className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {sessionError.message || "Failed to load voting session"}
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!activeCategory ? (
        <motion.div
          key="waiting"
          className="container mx-auto px-4 text-center"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
        >
          <h1 className="mb-12 text-6xl font-bold">{session.name}</h1>
          <p className="text-2xl">Waiting for the next award.</p>
          <p className="text-muted-foreground mt-4">
            The host will present the next category soon.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key={activeCategory.id}
          className="container mx-auto px-4 py-8"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
        >
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold">{session.name}</h1>
            <p className="text-muted-foreground mt-2">
              {isClosed
                ? "Voting has closed"
                : activeCategory.type === "RANKING"
                  ? `Rank your top ${activeCategory.rankingTop} choices`
                  : "Cast your vote"}
            </p>
            {hasVoted && !isClosed && (
              <p className="text-chart-2 mt-2">
                You have already voted in this category
              </p>
            )}
            {voteError && (
              <Alert variant="destructive" className="mt-4">
                <CircleExclamationPoint className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  {voteError.message ||
                    "There was an error checking your vote status"}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle>{activeCategory.name}</CardTitle>
                {activeCategory.description && (
                  <p className="text-muted-foreground text-sm">
                    {activeCategory.description}
                  </p>
                )}
                {activeCategory.aggregateOf.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-muted-foreground text-xs">
                      Counts towards:
                    </span>
                    {activeCategory.aggregateOf.map(aggregate => (
                      <Badge
                        key={aggregate.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {aggregate.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <VotingInterface
                  nominations={activeCategory.nominations}
                  categoryId={activeCategory.id}
                  categoryType={activeCategory.type}
                  rankingTop={activeCategory.rankingTop}
                  myVotes={myVotes}
                  myVotesKey={myVotesOptions.queryKey}
                  closed={isClosed}
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
