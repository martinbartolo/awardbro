"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { CheckIcon } from "@phosphor-icons/react";
import { type QueryKey } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

import { NominationDescription } from "./nomination-description";
import { ShapeMarks } from "./shape-marks";

/** A nomination as the vote page shows it */
export type Nomination = {
  id: string;
  name: string;
  description?: string | null;
};

export type MyVotes = RouterOutputs["award"]["getMyVotes"];

/** The voter's saved vote or ranking, owned by `LiveVotingSession` */
export type MyVotesProps = {
  myVotes: MyVotes | undefined;
  /** Its query, which a vote updates straight away, before the server answers (optimistic.ts) */
  myVotesKey: QueryKey;
};

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
  // While tiles run on under the bar, it lifts off them; at the end of the list it sits flat.
  // The list has ended when a marker after the bar, the last thing on the page, is on screen.
  const end = useRef<HTMLDivElement>(null);
  const [covering, setCovering] = useState(false);
  useEffect(() => {
    const marker = end.current;
    if (!marker) return;
    const observer = new IntersectionObserver(([entry]) =>
      setCovering(!entry?.isIntersecting),
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className={cn(
          "bg-background sticky bottom-0 -mx-5 mt-auto border-t-2 border-transparent px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-[box-shadow,border-color] duration-300",
          // A shadow alone is lost on the Night ground: an edge in the secondary colour shows in both
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
      <div ref={end} aria-hidden className="h-px" />
    </>
  );
}

/** A quiet text button, for the way out beside the main action */
export function QuietButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-primary focus-visible:ring-ring rounded-md px-2 py-2 text-lg font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * A screen's message in place of the tiles: "Your vote is in" (a check badge), or a quiet one
 * such as "Voting has closed" (the shape set). Under a category's name it sits a little below
 * it, so it reads as that category's answer; on its own it's in the middle of the screen.
 */
export function VoteOutcome({
  title,
  children,
  action,
  mark = "shapes",
  anchored = true,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /** A vote went in ("check"); otherwise there's nothing to celebrate ("shapes") */
  mark?: "check" | "shapes";
  anchored?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center text-center",
        anchored ? "pt-[8vh] pb-10" : "justify-center pb-16",
      )}
      // Announced when it appears, as the answer to the voter's tap
      role="status"
    >
      {mark === "check" ? (
        <div className="bg-primary text-primary-foreground shadow-lift motion-safe:animate-in motion-safe:zoom-in-50 mb-7 grid size-32 place-items-center rounded-full duration-500 ease-[var(--ease-spring)]">
          <CheckIcon weight="bold" className="size-16" />
        </div>
      ) : (
        <ShapeMarks className="mb-6" />
      )}
      <h2 className="text-3xl leading-tight font-bold text-balance">{title}</h2>
      <div className="text-muted-foreground mt-3 flex max-w-xs flex-col items-center text-lg leading-snug">
        {children}
      </div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * Where a vote (or ranking) stands, around the form that makes it: once voting has closed,
 * what it was; once it's in, "Your vote is in" with a way to change it; otherwise the form.
 */
export function VoteStages({
  noun,
  summary,
  loaded,
  closed,
  editing,
  onChange,
  children,
}: {
  noun: "vote" | "ranking";
  /** The vote that counts, said in full; null when there's none */
  summary: ReactNode;
  /** Whether the voter's vote has loaded, so "none" is known rather than not yet checked */
  loaded: boolean;
  closed: boolean;
  /** The voter is making or changing it: the form shows */
  editing: boolean;
  onChange: () => void;
  /** The form */
  children: ReactNode;
}) {
  const watch = <p className="mt-4">Watch the big screen for the results.</p>;
  if (closed) {
    return (
      <VoteOutcome title="Voting has closed">
        {summary ? (
          <>
            {summary}
            {watch}
          </>
        ) : loaded ? (
          <>
            {noun === "vote"
              ? "You didn't vote in this one."
              : "You didn't rank this one."}
            {watch}
          </>
        ) : (
          `Checking your ${noun}...`
        )}
      </VoteOutcome>
    );
  }
  if (summary && !editing) {
    return (
      <VoteOutcome
        title={`Your ${noun} is in`}
        mark="check"
        action={<QuietButton onClick={onChange}>Change my {noun}</QuietButton>}
      >
        {summary}
        {watch}
      </VoteOutcome>
    );
  }
  return children;
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

/** A nomination's name on its tile, with the description that tells apart one of the same name */
export function TileText({
  nomination,
  picked,
}: {
  nomination: Nomination;
  picked: boolean;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-xl leading-tight font-semibold break-words">
        {nomination.name}
      </span>
      {nomination.description && (
        <NominationDescription
          description={nomination.description}
          className={cn(
            "mt-1 text-base leading-snug break-words",
            picked ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
          imageClassName="relative mt-2 h-24 w-full [&_img]:rounded-[12px]"
        />
      )}
    </span>
  );
}

/** The look of a nomination tile: rounded, soft, the action colour when picked */
export const tileClass = (picked: boolean, disabled?: boolean) =>
  cn(
    "shadow-soft focus-visible:ring-ring w-full rounded-[20px] text-left transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-[0.98]",
    picked
      ? "bg-primary text-primary-foreground"
      : "bg-card text-card-foreground",
    disabled && "cursor-not-allowed opacity-50",
  );
