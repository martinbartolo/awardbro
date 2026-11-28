"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import { useDocumentTheme, useWakeLock } from "~/lib/hooks/useBigScreen";
import { useShowEvents } from "~/lib/hooks/useShowEvents";
import { votingHasClosed } from "~/lib/stages";
import { cn } from "~/lib/utils";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

import { AggregateInfo } from "./aggregate-info";
import { FullscreenButton } from "./fullscreen-button";
import { JoinPanel, RoomCodeChip } from "./join-info";
import { LiveVoting } from "./live-voting";
import { PodiumReveal } from "./podium-reveal";

type Session = RouterOutputs["award"]["getSession"];
type Category = Session["categories"][number];

type LivePresentationProps = {
  initialSession: Session;
  code: string;
};

/** What the big screen shows for the category on it (or none) */
type Scene = "waiting" | "voting" | "closed" | "aggregate" | "revealed";

const sceneOf = (category: Category | undefined): Scene => {
  if (!category) return "waiting";
  if (category.reveals.revealed) return "revealed";
  if (category.type === "AGGREGATE") return "aggregate";
  return votingHasClosed(category) ? "closed" : "voting";
};

/** Up to this many awards, the progress shows a dot for each */
const MAX_DOTS = 12;

/**
 * The big screen: the category on it, how to join, the live count, and the reveal. It follows
 * the show live, and the host's theme for it (Night or Paper).
 */
export function LivePresentation({
  initialSession,
  code,
}: LivePresentationProps) {
  const trpc = useTRPC();
  useShowEvents(code, { liveCounts: true });
  const { data: session, isError } = useQuery(
    trpc.award.getSession.queryOptions(
      { code, bigScreen: true },
      { initialData: initialSession, retry: 3 },
    ),
  );

  useEffect(() => {
    if (isError)
      toast.error("Can't get the latest from the show, trying again...");
  }, [isError]);

  const theme = session.screenTheme === "PAPER" ? "light" : "dark";
  useDocumentTheme(theme);
  useWakeLock();

  const category = session.categories[0];
  const scene = sceneOf(category);

  // A reveal plays when this screen saw the category before it: on a reload it shows at once
  const reduceMotion = useReducedMotion();
  const [watched, setWatched] = useState(
    scene === "revealed" ? null : category?.id,
  );
  if (category && scene !== "revealed" && watched !== category.id) {
    setWatched(category.id);
  }
  const playReveal =
    scene === "revealed" && watched === category?.id && !reduceMotion;

  // Joining is the main thing while waiting and voting; otherwise it moves to a corner
  const joinInCorner = scene !== "waiting" && scene !== "voting";

  return (
    <main
      data-theme={theme === "light" ? "light" : undefined}
      className="big-screen bg-background text-foreground relative flex h-dvh flex-col overflow-hidden px-24 pt-16"
    >
      <header className="shrink-0">
        <h1 className="text-stage-title max-w-[calc(var(--u)*150)] leading-[1.05] font-bold tracking-[-0.01em] text-balance">
          {category?.name ?? session.name}
        </h1>
        {category?.description && (
          <p className="text-muted-foreground text-stage-body mt-2 line-clamp-2 max-w-[calc(var(--u)*130)]">
            {category.description}
          </p>
        )}
        <div className="mt-5 flex min-h-[calc(var(--u)*6)] items-center gap-5">
          {category ? (
            <Progress
              progress={session.progress}
              countsTowards={category.aggregateOf.map(a => a.name)}
            />
          ) : (
            <p className="text-muted-foreground text-stage-lead font-medium">
              Waiting for the next award.
            </p>
          )}
          {joinInCorner && (
            <div className="ml-auto">
              <RoomCodeChip code={code} />
            </div>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.section
          // A new scene for each category and stage: a quick fade, no movement
          key={`${category?.id}-${scene}`}
          aria-live="polite"
          className={cn(
            "min-h-0 flex-1",
            scene === "revealed" ? "pt-10" : "pb-16",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35 }}
        >
          {scene === "waiting" && (
            <div className="flex h-full items-center">
              <JoinPanel code={code} />
            </div>
          )}

          {scene === "voting" && category && (
            <div className="flex h-full items-center justify-between gap-12">
              <JoinPanel code={code} />
              <LiveVoting
                categoryId={category.id}
                initialVoteCount={category.estimatedVoters ?? 0}
              />
            </div>
          )}

          {scene === "closed" && category && (
            <div className="flex h-full items-center gap-16">
              <LiveVoting
                categoryId={category.id}
                initialVoteCount={category.estimatedVoters ?? 0}
              />
              <div>
                <p className="text-stage-display leading-none font-bold">
                  Voting has closed
                </p>
                <p className="text-muted-foreground text-stage-lead mt-5 font-medium">
                  The winner is next.
                </p>
              </div>
            </div>
          )}

          {scene === "aggregate" && category && (
            <AggregateInfo sourceCategories={category.sourceCategories} />
          )}

          {scene === "revealed" &&
            category &&
            (category.nominations.length === 0 ? (
              <p className="text-muted-foreground text-stage-lead flex h-full items-center font-medium">
                No nominations in this one.
              </p>
            ) : (
              <PodiumReveal category={category} animate={playReveal} />
            ))}
        </motion.section>
      </AnimatePresence>

      <FullscreenButton />
    </main>
  );
}

/** Which award of the show is on the screen: a dot for each, and "Award 4 of 9" */
function Progress({
  progress,
  countsTowards,
}: {
  progress: Session["progress"];
  /** The aggregate categories this one adds up into */
  countsTowards: string[];
}) {
  return (
    <div className="text-muted-foreground text-stage-small flex min-w-0 items-center gap-5 font-medium">
      {progress && progress.of <= MAX_DOTS && (
        <ol aria-hidden className="flex shrink-0 items-center gap-2.5">
          {Array.from({ length: progress.of }, (_, i) => (
            <li
              key={i}
              className={cn(
                "h-3 rounded-full",
                i + 1 === progress.award
                  ? "bg-primary w-9"
                  : i + 1 < progress.award
                    ? "bg-muted-foreground w-3"
                    : "bg-border w-3",
              )}
            />
          ))}
        </ol>
      )}
      {progress && (
        <p className="shrink-0">
          Award {progress.award} of {progress.of}
        </p>
      )}
      {countsTowards.length > 0 && (
        <p className="truncate">Counts towards {countsTowards.join(", ")}</p>
      )}
    </div>
  );
}
