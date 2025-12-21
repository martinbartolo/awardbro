"use client";

import { useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

import { VotingInterface } from "./voting-interface";

type Session = RouterOutputs["award"]["getSessionBySlug"];

type LiveVotingSessionProps = {
  initialSession: Session;
  slug: string;
  initialHasVoted: boolean;
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
  slug,
  initialHasVoted,
}: LiveVotingSessionProps) {
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

  const activeCategory = session.categories[0];

  const {
    data: hasVoted = initialHasVoted,
    error: voteError,
    isError: isVoteError,
  } = api.award.hasVoted.useQuery(
    { categoryId: activeCategory?.id ?? "" },
    {
      refetchInterval: 5000,
      initialData: initialHasVoted,
      retry: 3,
      enabled: !!activeCategory,
    },
  );

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
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {sessionError?.message || "Failed to load voting session"}
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
            <p className="text-muted-foreground mt-2">Cast your vote</p>
            {hasVoted && (
              <p className="text-chart-2 mt-2">
                You have already voted in this category
              </p>
            )}
            {voteError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
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
              </CardHeader>
              <CardContent>
                <VotingInterface
                  nominations={activeCategory.nominations}
                  categoryId={activeCategory.id}
                  isAggregate={activeCategory.isAggregate}
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
