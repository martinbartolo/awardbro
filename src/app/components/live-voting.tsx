"use client";

import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

type LiveVotingProps = {
  categoryId: string;
  initialVoteCount: number;
};

const MAX_RETRIES = 3;

/** The big screen's live count of votes in the category on it */
export function LiveVoting({ categoryId, initialVoteCount }: LiveVotingProps) {
  const lastToastTimeRef = useRef(0);

  const trpc = useTRPC();
  const { data, isError, failureCount } = useQuery(
    trpc.award.getCategory.queryOptions(
      { id: categoryId },
      {
        // Fetched again on each vote by the page's live events (LivePresentation)
        staleTime: 0,
        retry: MAX_RETRIES,
      },
    ),
  );

  // Estimated on the server: ranking categories score points, not votes. Once the category is
  // revealed, only hosts get it, so keep the last count until this view gives way to the results.
  const [lastKnownVotes, setLastKnownVotes] = useState(initialVoteCount);
  const latestVotes = data?.estimatedVoters;
  if (latestVotes != null && latestVotes !== lastKnownVotes) {
    setLastKnownVotes(latestVotes);
  }
  const totalVotes = lastKnownVotes;

  // The page keeps the last count it had while it can't fetch, and says so once
  useEffect(() => {
    if (!isError) return;
    const now = Date.now();
    if (now - lastToastTimeRef.current < 2000) return;
    lastToastTimeRef.current = now;
    toast.error(
      failureCount < MAX_RETRIES
        ? "Can't get the latest votes, trying again..."
        : "Can't get the latest votes. Refresh the page.",
    );
  }, [isError, failureCount]);

  return (
    <div
      // A hop with each new vote: remounted by its count
      key={totalVotes}
      className={cn(
        "bg-primary text-primary-foreground shadow-lift grid size-82 shrink-0 place-content-center rounded-full text-center",
        totalVotes > initialVoteCount &&
          "motion-safe:animate-[count-bump_0.5s_var(--ease-spring)]",
      )}
    >
      <p
        className="text-stage-count leading-none font-bold tabular-nums"
        // Announced as it changes, and found by the end-to-end tests
        role="status"
        aria-label="Total votes"
      >
        {totalVotes.toLocaleString()}
      </p>
      <p className="text-stage-lead font-medium">votes in</p>
    </div>
  );
}
