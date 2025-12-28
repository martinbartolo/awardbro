"use client";

import { useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { api, type RouterOutputs } from "~/trpc/react";

import { AggregateInfo } from "./aggregate-info";
import { LiveVoting } from "./live-voting";
import { WinnerAnimation } from "./winner-animation";

type Session = RouterOutputs["award"]["getSessionBySlug"];

type LivePresentationProps = {
  initialSession: Session;
  slug: string;
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

const categoryVariants = {
  hidden: { opacity: 0, x: 0 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 },
  },
  exit: {
    opacity: 0,
    x: 0,
    transition: { duration: 0.3 },
  },
};

export function LivePresentation({
  initialSession,
  slug,
}: LivePresentationProps) {
  const {
    data: session,
    error: sessionError,
    isError: isSessionError,
  } = api.award.getSessionBySlug.useQuery(
    { slug, activeOnly: true },
    {
      refetchInterval: 5000,
      initialData: initialSession,
      retry: 3,
    },
  );

  useEffect(() => {
    if (isSessionError) {
      toast.error("Failed to fetch presentation updates");
    }
  }, [isSessionError]);

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
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {sessionError.message || "Failed to load presentation"}
            <button
              onClick={() => window.location.reload()}
              className="underline hover:no-underline"
            >
              Refresh page
            </button>
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {session.categories.length === 0 ? (
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
            The host will activate categories when ready.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="active"
          className="container mx-auto px-4 pt-16"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
        >
          <h1 className="text-foreground mb-12 text-center text-6xl font-bold">
            {session.name}
          </h1>

          <div className="space-y-8">
            <AnimatePresence mode="wait">
              {session.categories.map(category => (
                <motion.div
                  key={category.id}
                  className={`bg-background rounded-lg p-8 transition-all duration-500 ${
                    !category.revealed && "opacity-50"
                  }`}
                  variants={categoryVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2 className="text-foreground mb-6 text-center text-4xl font-semibold">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="text-muted-foreground mb-8 text-center text-xl">
                      {category.description}
                    </p>
                  )}
                  {category.aggregateOf.length > 0 && (
                    <div className="mb-8 flex flex-wrap items-center justify-center gap-1">
                      <span className="text-muted-foreground text-sm">
                        Counts towards:
                      </span>
                      {category.aggregateOf.map(aggregate => (
                        <Badge key={aggregate.id} variant="secondary">
                          {aggregate.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {category.revealed ? (
                    <motion.div
                      className={`grid grid-cols-1 gap-8 ${
                        category.winnerOnly
                          ? "min-h-[200px] place-items-center"
                          : ""
                      }`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {(() => {
                        const sortedNominations = [
                          ...category.nominations,
                        ].sort((a, b) => b._count.votes - a._count.votes);

                        const topNomination = sortedNominations[0];
                        if (!topNomination) {
                          return (
                            <div className="text-muted-foreground w-full rounded-xl border border-dashed p-10 text-center text-xl">
                              No nominations yet.
                            </div>
                          );
                        }

                        const totalScore = sortedNominations.reduce(
                          (sum, nom) => sum + nom._count.votes,
                          0,
                        );
                        const highestVoteCount = topNomination._count.votes;
                        const winners = sortedNominations.filter(
                          n => n._count.votes === highestVoteCount,
                        );

                        // Only crown a winner when at least one vote/point has been cast
                        // (or there's only one nominee).
                        const hasWinner =
                          totalScore > 0 || sortedNominations.length === 1;
                        const isTied = hasWinner && winners.length > 1;
                        const isCompleteTie =
                          hasWinner &&
                          sortedNominations.length > 1 &&
                          winners.length === sortedNominations.length;

                        // Filter to winners only if winnerOnly is enabled
                        const displayNominations = category.winnerOnly
                          ? hasWinner
                            ? winners
                            : []
                          : sortedNominations;

                        return (
                          <>
                            {!hasWinner && (
                              <div className="w-full rounded-xl border border-dashed p-10 text-center">
                                <div className="text-foreground text-2xl font-semibold">
                                  No votes yet
                                </div>
                                <div className="text-muted-foreground mt-2 text-lg">
                                  Cast at least one vote to reveal a winner.
                                </div>
                              </div>
                            )}

                            {isCompleteTie && (
                              <div className="w-full rounded-xl border border-dashed p-6 text-center">
                                <div className="text-foreground text-lg font-semibold">
                                  It&apos;s a tie!
                                </div>
                                <div className="text-muted-foreground mt-1 text-sm">
                                  All nominees share the top score.
                                </div>
                              </div>
                            )}

                            {displayNominations.map((nomination, index) => {
                              const isWinner =
                                hasWinner &&
                                nomination._count.votes === highestVoteCount;

                              return (
                                <div
                                  key={nomination.id}
                                  className={`${
                                    isWinner
                                      ? "col-span-1 w-full md:px-12"
                                      : "col-span-1 md:mx-auto md:w-full md:max-w-2xl"
                                  }`}
                                >
                                  <WinnerAnimation
                                    nomination={nomination}
                                    index={index}
                                    isWinner={isWinner}
                                    isTied={isTied}
                                    categoryType={category.type}
                                    hideVoteCounts={category.hideVoteCounts}
                                  />
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </motion.div>
                  ) : category.type === "AGGREGATE" ? (
                    <AggregateInfo
                      sourceCategories={category.sourceCategories}
                    />
                  ) : (
                    <LiveVoting
                      categoryId={category.id}
                      initialVoteCount={(() => {
                        const rawTotal = category.nominations.reduce(
                          (sum, nom) => sum + nom._count.votes,
                          0,
                        );
                        // For ranking categories, estimate voter count from points
                        if (
                          category.type === "RANKING" &&
                          category.rankingTop
                        ) {
                          const pointsPerVoter =
                            (category.rankingTop * (category.rankingTop + 1)) /
                            2;
                          return Math.round(rawTotal / pointsPerVoter);
                        }
                        return rawTotal;
                      })()}
                      categoryType={category.type}
                      rankingTop={category.rankingTop}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
