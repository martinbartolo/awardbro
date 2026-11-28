"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { launchConfetti } from "~/lib/confetti";
import { showsPictures } from "~/lib/images";
import { columnColours, podium, riseOrder } from "~/lib/podium";
import { getScoreLabel, type LabelledCategory } from "~/lib/scoring";
import { cn } from "~/lib/utils";

import { NominationDescription } from "./nomination-description";

type Nomination = {
  id: string;
  name: string;
  description: string | null;
  /** Null when the show hides it */
  score: number | null;
  /** 1 for the winners; null without votes, or when the show hides it */
  place: number | null;
};

export type RevealedCategory = LabelledCategory & {
  id: string;
  name: string;
  nominations: Nomination[];
  reveals: { winnerOnly: boolean };
};

/** Where the reveal has got to */
type Phase = {
  /** How many runners-up have risen, shortest first */
  risen: number;
  /** The winner rises to just under the leader and shakes */
  tense: boolean;
  /** "And the winner is…" fills the screen */
  beat: boolean;
  /** The winner's column turns the winner colour and grows; the name and confetti land */
  crowned: boolean;
};

const SETTLED: Phase = {
  risen: Infinity,
  tense: false,
  beat: false,
  crowned: true,
};

/** The reveal's beats, in milliseconds */
const PAUSE_BEFORE = 500;
const PER_RUNNER_UP = 900;
const TENSION = 1600;
const BEAT = 1600;

/**
 * A revealed category's results as a podium: each nomination a rounded column in its own colour,
 * the winner in the middle. With `animate`, the results arrive as a race: the runners-up rise
 * from the shortest, the leader stalls and shakes, the screen says "And the winner is…", then the
 * winner's column turns gold and grows as the name and confetti land. Without it (a reload, or
 * reduced motion) the result shows at once.
 *
 * The list holds every result best first, whatever the order on screen, so screen readers (and
 * the end-to-end tests) read them in order.
 */
export function PodiumReveal({
  category,
  animate,
}: {
  category: RevealedCategory;
  /** Whether to play the reveal: only when it happens on this screen, with motion allowed */
  animate: boolean;
}) {
  const { winnerOnly } = category.reveals;
  const { columns, rest, winners } = useMemo(
    () => podium(category.nominations, { winnerOnly }),
    [category.nominations, winnerOnly],
  );
  const colours = useMemo(
    () =>
      columnColours(
        category.id,
        category.nominations.map(n => n.id),
        new Set(columns.map(c => c.id)),
      ),
    [category.id, category.nominations, columns],
  );
  const pictures = showsPictures(category);

  // Played once, from when the reveal first shows; later changes (the host switching what the
  // results show) move the columns without replaying it
  const [played] = useState(() => animate && winners.length > 0);
  const [phase, setPhase] = useState<Phase>(
    played ? { risen: 0, tense: false, beat: false, crowned: false } : SETTLED,
  );
  const runnersUp = riseOrder(columns).filter(c => !c.winner);
  const runnerUpCount = useRef(runnersUp.length);

  useEffect(() => {
    if (!played) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = PAUSE_BEFORE;
    const then = (change: Partial<Phase>) => {
      timers.push(setTimeout(() => setPhase(p => ({ ...p, ...change })), at));
    };
    for (let risen = 1; risen <= runnerUpCount.current; risen++) {
      then({ risen });
      at += PER_RUNNER_UP;
    }
    then({ tense: true });
    at += TENSION;
    then({ beat: true });
    at += BEAT;
    then(SETTLED);
    return () => timers.forEach(clearTimeout);
  }, [played]);

  // Confetti from the winner's column as it's crowned
  const canvas = useRef<HTMLCanvasElement>(null);
  const winnerBar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!played || !phase.crowned || !canvas.current) return;
    const style = getComputedStyle(canvas.current);
    const colours = [1, 2, 3, 4].map(i =>
      style.getPropertyValue(`--shape-${i}`).trim(),
    );
    const bar = winnerBar.current?.getBoundingClientRect();
    return launchConfetti(canvas.current, {
      colours,
      origin: {
        x: bar ? (bar.left + bar.width / 2) / window.innerWidth : 0.5,
        y: bar ? bar.top / window.innerHeight : 0.5,
      },
    });
  }, [played, phase.crowned]);

  const risenIds = new Set(
    runnersUp.slice(0, phase.risen).map(column => column.id),
  );
  const tallestRunnerUp = Math.max(0, ...runnersUp.map(c => c.height));
  const singleWinner = winners.length === 1;

  // Room above the columns for what stands on them: a single winner's name, or the headline for
  // a tie, and the pictures in an image category
  const reserve = (singleWinner ? 26 : 16) + (pictures ? 24 : 0);

  const headline =
    winners.length === 0
      ? "Nobody voted in this one."
      : winners.length > 1
        ? "It's a tie!"
        : null;

  return (
    <>
      <div className="relative h-full">
        {headline && (
          <p
            className={cn(
              "text-stage-display absolute inset-x-0 top-0 text-center leading-none font-bold text-balance",
              "ease-out-soft transition-[opacity,translate] duration-700 motion-reduce:transition-none",
              phase.crowned ? "opacity-100" : "translate-y-5 opacity-0",
            )}
          >
            {headline}
          </p>
        )}
        <ol
          // Safari drops the list role of a list without bullets
          role="list"
          aria-label={`${category.name} results`}
          className="flex h-full justify-center gap-7"
          style={
            {
              "--reserve": `calc(var(--u) * ${reserve})`,
            } as React.CSSProperties
          }
        >
          {columns.map(column => {
            const crowned = column.winner && phase.crowned;
            const risen = column.winner
              ? phase.tense || phase.crowned
              : risenIds.has(column.id);
            // Before the crown the winner waits just under the leader
            const height =
              column.winner && !phase.crowned
                ? tallestRunnerUp > 0
                  ? Math.min(column.height, tallestRunnerUp * 0.97)
                  : 0.6
                : column.height;
            const labelShown = column.winner ? phase.crowned : risen;
            const nameAbove = column.winner && singleWinner;
            const label =
              column.score !== null && getScoreLabel(category, column.score);

            return (
              <li
                key={column.id}
                className={cn(
                  "relative flex min-w-0 basis-0 flex-col justify-end",
                  "ease-out-soft transition-[flex-grow,max-width] duration-700 motion-reduce:transition-none",
                  crowned
                    ? "max-w-[calc(var(--u)*56)]"
                    : "max-w-[calc(var(--u)*34)]",
                )}
                style={{
                  order: column.slot,
                  flexGrow: crowned ? (singleWinner ? 1.7 : 1.3) : 1,
                }}
              >
                {column.winner && <span className="sr-only">Winner</span>}

                {nameAbove && (
                  <p
                    className={cn(
                      "absolute inset-x-[-40%] text-center leading-[1.02] font-bold text-balance",
                      nameSize(column.name),
                      "ease-out-soft transition-[opacity,translate] duration-700 motion-reduce:transition-none",
                      crowned ? "opacity-100" : "translate-y-5 opacity-0",
                    )}
                    style={{ bottom: barTop(height, pictures) }}
                  >
                    {column.name}
                  </p>
                )}

                {pictures && (
                  <div
                    className={cn(
                      "absolute left-1/2 aspect-square w-[min(90%,calc(var(--u)*22))] -translate-x-1/2",
                      "transition-opacity duration-500 motion-reduce:transition-none",
                      risen ? "opacity-100" : "opacity-0",
                    )}
                    style={{ bottom: barTop(height, false) }}
                  >
                    <NominationDescription
                      description={column.description}
                      isImage
                      imageClassName="size-full [&_img]:size-full [&_img]:rounded-[calc(var(--u)*2.5)] [&_img]:object-cover"
                    />
                  </div>
                )}

                <div
                  ref={column.id === winners[0]?.id ? winnerBar : undefined}
                  className={cn(
                    "relative rounded-t-[calc(var(--u)*5)]",
                    "ease-out-soft transition-[height,background-color,color] duration-[1200ms] motion-reduce:transition-none",
                    column.winner &&
                      phase.tense &&
                      !phase.beat &&
                      !phase.crowned &&
                      "motion-safe:animate-[podium-tense_0.18s_linear_infinite]",
                  )}
                  style={{
                    height: risen ? barHeight(height) : 0,
                    backgroundColor: crowned
                      ? "var(--winner)"
                      : `var(--column-${colours.get(column.id) ?? 1})`,
                    color: crowned
                      ? "var(--winner-foreground)"
                      : "var(--column-foreground)",
                  }}
                >
                  <div
                    className={cn(
                      "absolute inset-x-0 top-6 flex flex-col-reverse items-center gap-1 px-3 text-center",
                      "transition-opacity duration-300 motion-reduce:transition-none",
                      labelShown ? "opacity-100 delay-500" : "opacity-0",
                    )}
                  >
                    {/* First in the list, but shown under the score (except a single winner's, above) */}
                    {!nameAbove && (
                      <span
                        className={cn(
                          "line-clamp-2 leading-tight font-semibold break-words",
                          column.winner
                            ? "text-stage-lead"
                            : "text-stage-small",
                        )}
                      >
                        {column.name}
                      </span>
                    )}
                    {label && (
                      <span className="flex flex-col items-center leading-none">
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            crowned
                              ? "text-[calc(var(--u)*9.9)]"
                              : "text-stage-score",
                          )}
                        >
                          {column.score}
                        </span>{" "}
                        <span className="text-stage-small mt-1 font-medium opacity-80">
                          {label}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}

          {rest.length > 0 && (
            <li className="bg-track text-muted-foreground order-last flex max-w-[calc(var(--u)*40)] min-w-0 flex-1 basis-0 flex-col self-end rounded-t-[calc(var(--u)*5)] px-5 pt-5 pb-4">
              <p className="text-stage-small text-foreground font-semibold">
                And the rest
              </p>
              <ul className="text-stage-small mt-2 space-y-1">
                {rest.map(nomination => (
                  <li key={nomination.id} className="flex gap-3">
                    <span className="min-w-0 truncate">{nomination.name}</span>
                    {nomination.score !== null && (
                      <span className="ml-auto tabular-nums">
                        {nomination.score}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ol>
      </div>

      {/* The spoken beat before the crown */}
      <div
        aria-hidden
        className={cn(
          "bg-background text-stage-beat pointer-events-none fixed inset-0 z-40 grid place-items-center px-24 text-center font-bold",
          "transition-opacity duration-400",
          phase.beat ? "opacity-100" : "opacity-0",
        )}
      >
        And the winner is…
      </div>
      <canvas
        ref={canvas}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50 size-full"
      />
    </>
  );
}

/** The winner's name as big as it can be without running past two lines */
const nameSize = (name: string) =>
  name.length <= 16
    ? "text-stage-display"
    : name.length <= 28
      ? "text-stage-headline"
      : "text-stage-title";

/** A column's height: its share of the room under what stands on it, never too short for its label */
const barHeight = (share: number) =>
  `max(calc((100% - var(--reserve)) * ${share}), calc(var(--u) * 17))`;

/** Where something standing on a column sits: just above its top, or above its picture */
const barTop = (share: number, abovePicture: boolean) =>
  `calc(${barHeight(share)} + var(--u) * ${abovePicture ? 26 : 2})`;
