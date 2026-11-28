"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { CheckIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";

import { Button } from "~/components/ui/button";
import { launchConfetti } from "~/lib/confetti";
import { cn } from "~/lib/utils";

import { ShapeMarks } from "./shape-marks";

/** A smaller burst than the winner's, for one vote on one phone */
const VOTE_PIECES = 120;

/**
 * A small burst of confetti when a vote goes in: the canvas to render, and the function that
 * fires it. Nothing with reduced motion.
 */
export function useVoteConfetti() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => stop.current?.(), []);

  const burst = useCallback(() => {
    if (reduceMotion || !canvas.current) return;
    const style = getComputedStyle(canvas.current);
    stop.current?.();
    stop.current = launchConfetti(canvas.current, {
      colours: [1, 2, 3, 4].map(i =>
        style.getPropertyValue(`--shape-${i}`).trim(),
      ),
      // From the "Your vote is in" badge
      origin: { x: 0.5, y: 0.38 },
      pieces: VOTE_PIECES,
      size: 2.2,
    });
  }, [reduceMotion]);

  const element = (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 size-full"
    />
  );
  return [element, burst] as const;
}

/** The page's one action, pinned at the bottom of the screen in thumb reach */
export function PinnedAction({
  children,
  disabled,
  onClick,
  below,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  /** A quieter way out under it, such as keeping the vote already made */
  below?: ReactNode;
}) {
  // While tiles run on under the bar, it lifts off them with a soft shadow; at the end of the
  // list it sits flat. (A marker just above the bar is on screen once the list has ended.)
  const end = useRef<HTMLDivElement>(null);
  const [covering, setCovering] = useState(false);
  useEffect(() => {
    const marker = end.current;
    if (!marker) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCovering(!entry?.isIntersecting),
      // The bar's own height, so "on screen" means above it
      { rootMargin: "0px 0px -120px 0px" },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={end} aria-hidden className="h-px" />
      <div
        className={cn(
          "bg-background sticky bottom-0 -mx-5 mt-auto border-t-2 border-transparent px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-[box-shadow,border-color] duration-300",
          // A shadow alone is lost on the Night ground: an edge in the line colour shows in both
          covering &&
            "border-secondary shadow-[0_-14px_28px_-10px_var(--shadow-color)]",
        )}
      >
        <Button
          // Quiet until there's something to send
          className="shadow-lift disabled:bg-muted disabled:text-muted-foreground h-15 w-full rounded-full text-xl font-bold disabled:opacity-100 disabled:shadow-none"
          disabled={disabled}
          onClick={onClick}
        >
          <span className="truncate">{children}</span>
        </Button>
        {below && <div className="mt-2 flex justify-center">{below}</div>}
      </div>
    </>
  );
}

/** A quiet text button, for the way out beside the main action */
export function QuietButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-primary focus-visible:ring-ring rounded-md px-2 py-2 text-lg font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

/**
 * The end of a vote: "Your vote is in", or once voting has closed, what the voter's vote was.
 * Anchored a little below the category's name, so it reads as that category's answer.
 */
export function VoteOutcome({
  title,
  children,
  action,
  done = true,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /** A vote went in (a check badge); otherwise there's nothing to celebrate */
  done?: boolean;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center pt-[8vh] pb-10 text-center"
      // Announced when it appears, as the answer to the voter's tap
      role="status"
    >
      {done ? (
        <div className="bg-primary text-primary-foreground shadow-lift motion-safe:animate-in motion-safe:zoom-in-50 mb-7 grid size-32 place-items-center rounded-full duration-500 ease-[var(--ease-spring)]">
          <CheckIcon weight="bold" className="size-16" />
        </div>
      ) : (
        <ShapeMarks className="mb-6" />
      )}
      <h2 className="text-3xl leading-tight font-bold text-balance">{title}</h2>
      <div className="text-muted-foreground mt-3 max-w-xs text-lg leading-snug">
        {children}
      </div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** The tick on a nomination tile: an empty ring, filled when it's the voter's pick */
export function Tick({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border-[3px] transition-colors",
        checked
          ? "border-primary-foreground bg-primary-foreground"
          : // At least 3:1 against the tile in both themes
            "border-muted-foreground/70",
      )}
    >
      {checked && <span className="bg-primary size-2.5 rounded-full" />}
    </span>
  );
}

/** Marks the vote already in on a tile, while the voter picks again */
export function YourVote({ onPicked }: { onPicked: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold",
        onPicked
          ? "bg-primary-foreground text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      Your vote
    </span>
  );
}

/** The look of a nomination tile: rounded, soft, the action colour when picked */
export const tileClass = (picked: boolean, disabled?: boolean) =>
  cn(
    "focus-visible:ring-ring w-full rounded-[20px] text-left transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-[0.98]",
    picked
      ? "bg-primary text-primary-foreground shadow-soft"
      : "bg-card text-card-foreground shadow-soft",
    disabled && "cursor-not-allowed opacity-50",
  );
