"use client";

import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { toast } from "sonner";

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

  // A little hop with each new vote. Played on the element, so the status inside it stays put
  // and screen readers announce the new count.
  const circle = useRef<HTMLDivElement>(null);
  const shownVotes = useRef(totalVotes);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (totalVotes <= shownVotes.current) {
      shownVotes.current = totalVotes;
      return;
    }
    shownVotes.current = totalVotes;
    if (reduceMotion) return;
    circle.current?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.06)", offset: 0.4 },
        { transform: "scale(1)" },
      ],
      { duration: 500, easing: "cubic-bezier(0.2, 1.6, 0.4, 1)" },
    );
  }, [totalVotes, reduceMotion]);

  return (
    <div
      ref={circle}
      className="bg-primary text-primary-foreground shadow-lift grid size-82 shrink-0 place-content-center rounded-full text-center"
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
