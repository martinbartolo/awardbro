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
const BEAT_CLEAR = 400;

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
  // How many rise in the sequence, as it starts
  const [runnerUpCount] = useState(runnersUp.length);

  useEffect(() => {
    if (!played) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = PAUSE_BEFORE;
    const then = (change: Partial<Phase>) => {
      timers.push(setTimeout(() => setPhase(p => ({ ...p, ...change })), at));
    };
    for (let risen = 1; risen <= runnerUpCount; risen++) {
      then({ risen });
      at += PER_RUNNER_UP;
    }
    then({ tense: true });
    at += TENSION;
    then({ beat: true });
    at += BEAT;
    // The beat clears completely before the crown, so the name never lands on top of it
    then({ beat: false });
    at += BEAT_CLEAR;
    then(SETTLED);
    return () => timers.forEach(clearTimeout);
  }, [played, runnerUpCount]);

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

  if (winners.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-10 pb-12 text-center">
        <p className="text-stage-display leading-none font-bold">
          Nobody voted in this one.
        </p>
        <ol
          role="list"
          aria-label={`${category.name} results`}
          className="flex flex-wrap justify-center gap-4"
        >
          {category.nominations.map(nomination => (
            <li
              key={nomination.id}
              className="bg-card text-card-foreground text-stage-body rounded-full px-7 py-3 font-semibold"
            >
              {nomination.name}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Room above the columns for what stands on them: a single winner's name (two lines at most),
  // or the tie's one-line headline
  const winnerName = singleWinner && winnerNameSize(winners[0]!.name, pictures);
  const reserve = winnerName
    ? 2 * winnerName.u * NAME_LEADING + NAME_GAP
    : TIE_HEADLINE_U + NAME_GAP;
  // The shortest column: room for its label, ending clear of the bottom 5% of the screen, which
  // some TVs crop. With pictures, the photo is in it too (and the name keeps to one line).
  const floor = pictures ? 34 : 24;

  return (
    <>
      <div className="relative h-full">
        {!singleWinner && (
          <p
            className={cn(
              "text-stage-display absolute inset-x-0 top-0 text-center leading-none font-bold",
              "ease-out-soft transition-[opacity,translate] duration-700 motion-reduce:transition-none",
              phase.crowned ? "opacity-100" : "translate-y-5 opacity-0",
            )}
          >
            It&apos;s a tie!
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
              "--floor": `calc(var(--u) * ${floor})`,
            } as React.CSSProperties
          }
        >
          {columns.map(column => {
            const { winner } = column;
            const crowned = winner && phase.crowned;
            const risen = winner
              ? phase.tense || phase.crowned
              : risenIds.has(column.id);
            const shaking = winner && phase.tense && !phase.beat && !crowned;
            const labelShown = winner ? phase.crowned : risen;
            // Before the crown the winner waits just under the leader
            const waitingHeight =
              tallestRunnerUp > 0
                ? Math.min(column.height, tallestRunnerUp * 0.97)
                : 0.6;
            const height = winner && !crowned ? waitingHeight : column.height;
            const role = !winner
              ? "runnerUp"
              : singleWinner
                ? "winner"
                : "tied";
            const label =
              column.score !== null && getScoreLabel(category, column.score);

            // The host's photo at the top of the column. A winner's shows with the crown, with the
            // rest of its label, but loads from the start so it doesn't arrive late.
            const photo = pictures && (
              <div className={cn("mb-3 aspect-square", PHOTO_WIDTH[role])}>
                <NominationDescription
                  description={column.description}
                  isImage
                  // A picture that won't load leaves an icon in its place, the photo's size
                  thumbnail
                  imageClassName="size-full [&_img]:size-full [&_img]:rounded-[calc(var(--u)*2.5)] [&_img]:object-cover"
                />
              </div>
            );

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
                {winner && <span className="sr-only">Winner</span>}

                {role === "winner" && winnerName && (
                  <p
                    className={cn(
                      "absolute inset-x-[-40%] text-center leading-[1.02] font-bold text-balance",
                      winnerName.className,
                      "ease-out-soft transition-[opacity,translate] duration-700 motion-reduce:transition-none",
                      crowned ? "opacity-100" : "translate-y-5 opacity-0",
                    )}
                    style={{
                      bottom: `calc(${barHeight(height)} + var(--u) * ${NAME_GAP})`,
                    }}
                  >
                    {column.name}
                  </p>
                )}

                <div
                  ref={column.id === winners[0]?.id ? winnerBar : undefined}
                  className={cn(
                    "relative rounded-t-[calc(var(--u)*5)]",
                    "ease-out-soft transition-[height] duration-[1200ms] motion-reduce:transition-none",
                    COLUMN_COLOURS[(colours.get(column.id) ?? 1) - 1],
                    crowned
                      ? "text-winner-foreground"
                      : "text-column-foreground",
                    shaking &&
                      "motion-safe:animate-[podium-tense_0.18s_linear_infinite]",
                  )}
                  style={{ height: risen ? barHeight(height) : 0 }}
                >
                  {/* The crown: the winner colour fades in over the column's own */}
                  {winner && (
                    <div
                      aria-hidden
                      className={cn(
                        "bg-winner absolute inset-0 rounded-t-[inherit]",
                        "transition-opacity duration-500 motion-reduce:transition-none",
                        crowned ? "opacity-100" : "opacity-0",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "absolute inset-x-0 top-6 flex items-center gap-1 px-3 text-center",
                      // A runner-up's score above its name (its name comes first in the list)
                      winner ? "flex-col" : "flex-col-reverse",
                      "transition-opacity duration-300 motion-reduce:transition-none",
                      labelShown ? "opacity-100 delay-300" : "opacity-0",
                    )}
                  >
                    {/* On top: first for a winner, last (reversed) for a runner-up */}
                    {winner && photo}
                    {role !== "winner" && (
                      <span
                        className={cn(
                          "leading-tight break-words",
                          role === "tied"
                            ? // Tied winners' names carry the crown: they outrank the score
                              cn(
                                "mb-2 line-clamp-3 font-bold",
                                tiedNameSize(column.name),
                              )
                            : cn(
                                "text-stage-small font-semibold",
                                pictures ? "line-clamp-1" : "line-clamp-2",
                              ),
                        )}
                      >
                        {column.name}
                      </span>
                    )}
                    {label && (
                      <span className={cn("leading-none", SCORE[role].line)}>
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            SCORE[role].size,
                          )}
                        >
                          {column.score}
                        </span>{" "}
                        <span className="text-stage-small font-medium opacity-80">
                          {label}
                        </span>
                      </span>
                    )}
                    {!winner && photo}
                  </div>
                </div>
              </li>
            );
          })}

          {rest.length > 0 && (
            <li className="bg-track text-muted-foreground order-last flex max-w-[calc(var(--u)*40)] min-w-0 flex-1 basis-0 flex-col self-end rounded-t-[calc(var(--u)*5)] px-5 pt-5 pb-12">
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

      {/* The spoken beat before the crown: gone before the winner's name lands */}
      <div
        aria-hidden
        className={cn(
          "bg-background text-stage-beat pointer-events-none fixed inset-0 z-40 grid place-items-center px-24 text-center font-bold",
          "transition-opacity duration-300",
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

/** Each column's colour (`--column-1` to `--column-7`), written out so Tailwind finds them */
const COLUMN_COLOURS = [
  "bg-column-1",
  "bg-column-2",
  "bg-column-3",
  "bg-column-4",
  "bg-column-5",
  "bg-column-6",
  "bg-column-7",
];

type Role = "winner" | "tied" | "runnerUp";

/** How big each column's photo is: a single winner's the biggest */
const PHOTO_WIDTH: Record<Role, string> = {
  winner: "w-[min(80%,calc(var(--u)*20))]",
  tied: "w-[min(70%,calc(var(--u)*16))]",
  runnerUp: "w-[min(78%,calc(var(--u)*13))]",
};

/** The score and its unit: a single winner's large and stacked, the others on one line */
const SCORE: Record<Role, { line: string; size: string }> = {
  winner: {
    line: "flex flex-col items-center gap-1",
    size: "text-[calc(var(--u)*9.9)]",
  },
  tied: { line: "flex items-baseline gap-2", size: "text-stage-lead" },
  runnerUp: { line: "flex items-baseline gap-2", size: "text-stage-score" },
};

/** Line height of the winner's name, and its gap to the column under it (in --u) */
const NAME_LEADING = 1.02;
const NAME_GAP = 2;
/** "It's a tie!", one line at the display size (in --u, as in globals.css) */
const TIE_HEADLINE_U = 10.4;

/**
 * A single winner's name as big as it can be without running past two lines (at most the headline
 * size with pictures, to leave the columns room). `u` matches the size's token in globals.css: the
 * room above the columns is worked out from it.
 */
const WINNER_NAME_SIZES = [
  { maxLength: 16, className: "text-stage-display", u: 10.4 },
  { maxLength: 28, className: "text-stage-headline", u: 8 },
  { maxLength: Infinity, className: "text-stage-title", u: 6.4 },
];
const winnerNameSize = (name: string, pictures: boolean) =>
  WINNER_NAME_SIZES.slice(pictures ? 1 : 0).find(
    size => name.length <= size.maxLength,
  )!;

/** A tied winner's name, inside its column: smaller than a single winner's, never cut short */
const tiedNameSize = (name: string) =>
  name.length <= 10
    ? "text-stage-headline"
    : name.length <= 22
      ? "text-stage-title"
      : "text-stage-lead";

/**
 * A column's height: the shortest a column gets (`--floor`), plus its share of the room above
 * that, under what stands on the columns (`--reserve`)
 */
const barHeight = (share: number) =>
  `calc(var(--floor) + (100% - var(--reserve) - var(--floor)) * ${share})`;
