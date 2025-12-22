"use client";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { api } from "~/trpc/react";

type LiveVotingProps = {
  categoryId: string;
  initialVoteCount: number;
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      type: "spring" as const,
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.3 },
  },
};

const MAX_RETRIES = 3;

export function LiveVoting({ categoryId, initialVoteCount }: LiveVotingProps) {
  const [prevVotes, setPrevVotes] = useState(initialVoteCount);
  const lastToastTimeRef = useRef(0);

  const { data, error, isError, failureCount } = api.award.getCategory.useQuery(
    { id: categoryId },
    {
      refetchInterval: 1000,
      staleTime: 0,
      retry: MAX_RETRIES,
    },
  );

  // Derive error limit exceeded from failureCount (no setState needed)
  const hasExceededErrorLimit = isError && failureCount >= MAX_RETRIES;

  // Calculate totalVotes directly from data (derived state)
  const totalVotes = data
    ? data.nominations.reduce((sum, nom) => sum + nom._count.votes, 0)
    : initialVoteCount;

  // Calculate the vote difference for animation
  const voteDiff = totalVotes - prevVotes;
  const showVoteDiff = voteDiff > 0;

  // Update prevVotes after animation has time to display
  useEffect(() => {
    if (totalVotes === prevVotes) return;

    const timer = setTimeout(() => {
      setPrevVotes(totalVotes);
    }, 700);
    return () => clearTimeout(timer);
  }, [totalVotes, prevVotes]);

  // Handle error toasts with debouncing
  useEffect(() => {
    if (!isError) return;

    const now = Date.now();
    // Debounce toast notifications (at least 2 seconds apart)
    if (now - lastToastTimeRef.current < 2000) return;

    lastToastTimeRef.current = now;

    if (failureCount < MAX_RETRIES) {
      toast.error("Failed to fetch vote updates, retrying...");
    } else {
      toast.error("Failed to fetch vote updates. Please refresh the page.");
    }
  }, [isError, failureCount]);

  if (hasExceededErrorLimit) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message}
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
    <motion.div
      className="text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="relative mb-4" initial={false}>
        <motion.div
          key={totalVotes}
          initial={{ scale: 1.5, y: -20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            duration: 0.5,
          }}
          className="text-5xl font-bold text-white"
        >
          {totalVotes.toLocaleString()}
        </motion.div>

        <motion.div
          className="text-muted-foreground mt-2 text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Total Votes
        </motion.div>

        <AnimatePresence>
          {showVoteDiff && (
            <motion.div
              key={`diff-${totalVotes}`}
              initial={{ opacity: 1, scale: 1, y: 0 }}
              animate={{ opacity: 0, scale: 2, y: -30 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                type: "spring",
                stiffness: 100,
                damping: 10,
              }}
              className="absolute top-0 left-1/2 -translate-x-1/2 transform font-bold text-green-400"
            >
              +{voteDiff.toLocaleString()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="flex justify-center space-x-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="h-3 w-3 rounded-full bg-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
