'use client';

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { motion, AnimatePresence } from "framer-motion";

interface LiveVotingProps {
  categoryId: string;
  initialVoteCount: number;
}

export function LiveVoting({ categoryId, initialVoteCount }: LiveVotingProps) {
  const [totalVotes, setTotalVotes] = useState(initialVoteCount);
  const [prevVotes, setPrevVotes] = useState(initialVoteCount);

  // Use useQuery with refetchInterval instead of manual polling
  const { data } = api.award.getCategory.useQuery(
    { id: categoryId },
    {
      refetchInterval: 500,
      staleTime: 0, // Disable stale time for this query
    }
  );

  useEffect(() => {
    if (data) {
      const newTotal = data.nominations.reduce((sum, nom) => sum + nom._count.votes, 0);
      if (newTotal !== totalVotes) {
        setPrevVotes(totalVotes);
        setTotalVotes(newTotal);
      }
    }
  }, [data, totalVotes]);

  return (
    <div className="text-center">
      <motion.div 
        className="relative mb-4"
        initial={false}
      >
        <motion.div
          key={totalVotes}
          initial={{ scale: 1.5, y: -20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-5xl font-bold text-white"
        >
          {totalVotes.toLocaleString()}
        </motion.div>
        
        <motion.div 
          className="text-xl text-gray-400 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Total Votes
        </motion.div>

        <AnimatePresence>
          {totalVotes > prevVotes && (
            <motion.div
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 2, y: -20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-0 left-1/2 transform -translate-x-1/2 text-green-400 font-bold"
            >
              +{(totalVotes - prevVotes).toLocaleString()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div 
        className="flex justify-center space-x-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {[0,1,2].map((_, i) => (
          <motion.div
            key={i}
            className="h-3 w-3 rounded-full bg-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}