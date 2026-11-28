import { cn } from "~/lib/utils";

/**
 * The show's shapes (a circle, a triangle and a squiggle), drawn once for both the quiet-screen
 * mark and the list markers. Their colours are the mark tokens (globals.css): the shape colours
 * without the theme's winner colour.
 */
const SHAPES = [
  {
    viewBox: "0 0 24 24",
    colour: "text-mark-1",
    draw: <circle cx="12" cy="12" r="11" fill="currentColor" />,
  },
  {
    viewBox: "0 0 26 24",
    colour: "text-mark-2",
    draw: <path d="M13 1 25 23H1Z" fill="currentColor" />,
  },
  {
    viewBox: "0 0 44 18",
    colour: "text-mark-3",
    draw: (
      <path
        d="M3 9q6-8 12 0t12 0t12 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    ),
  },
];

/** Each shape's size in the quiet-screen mark, and its bob (offset so they move in turn) */
const MARK_SIZES = [
  "size-7 motion-safe:animate-[shape-bob_2.6s_ease-in-out_3]",
  "mb-2 size-8 motion-safe:animate-[shape-bob_2.6s_ease-in-out_-0.9s_3]",
  "h-5 w-12 motion-safe:animate-[shape-bob_2.6s_ease-in-out_-1.7s_3]",
];

/**
 * The shape set as a small mark over a quiet screen: waiting for an award, voting closed, the end
 * of the show. The same shapes as the confetti. They bob a few times as the screen appears, then
 * rest (phones sit on these screens for minutes), and not at all with reduced motion.
 */
export function ShapeMarks({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-end gap-3", className)}>
      {SHAPES.map(({ viewBox, colour, draw }, index) => (
        <svg
          key={viewBox}
          viewBox={viewBox}
          className={cn(colour, MARK_SIZES[index])}
        >
          {draw}
        </svg>
      ))}
    </div>
  );
}

/**
 * One shape from the set, as a small marker beside an item in a list (the run view's running
 * order): circle, triangle, squiggle in turn, in the mark colours in turn (shifting each round,
 * so a shape doesn't always have the same colour).
 */
export function ShapeMark({ index }: { index: number }) {
  const { viewBox, draw } = SHAPES[index % 3]!;
  const { colour } = SHAPES[(index + Math.floor(index / 3)) % 3]!;
  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      className={cn("size-3.5 shrink-0", colour)}
    >
      {draw}
    </svg>
  );
}
