"use client";

import { useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { api, type RouterOutputs } from "~/trpc/react";

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
            {sessionError?.message || "Failed to load presentation"}
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

                  {category.revealed ? (
                    <motion.div
                      className="grid grid-cols-1 gap-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {(() => {
                        const sortedNominations = category.nominations.sort(
                          (a, b) => b._count.votes - a._count.votes,
                        );
                        const highestVoteCount =
                          sortedNominations[0]?._count.votes;

                        return sortedNominations.map((nomination, index) => (
                          <div
                            key={nomination.id}
                            className={`${
                              nomination._count.votes === highestVoteCount
                                ? "col-span-1 md:px-12"
                                : "col-span-1 md:mx-auto md:w-full md:max-w-2xl"
                            }`}
                          >
                            <WinnerAnimation
                              nomination={nomination}
                              index={index}
                              isWinner={
                                nomination._count.votes === highestVoteCount
                              }
                              isTied={
                                sortedNominations.filter(
                                  n => n._count.votes === highestVoteCount,
                                ).length > 1
                              }
                            />
                          </div>
                        ));
                      })()}
                    </motion.div>
                  ) : (
                    <LiveVoting
                      categoryId={category.id}
                      initialVoteCount={category.nominations.reduce(
                        (sum, nom) => sum + nom._count.votes,
                        0,
                      )}
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
