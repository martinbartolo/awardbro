import { cn } from "~/lib/utils";

/**
 * The show's shape set (a circle, a triangle and a squiggle) as a small mark over a quiet
 * screen: waiting for an award, voting closed. The same shapes as the confetti, in the theme's
 * shape colours. They bob a few times as the screen appears, then rest (phones sit on these
 * screens for minutes), and not at all with reduced motion.
 */
export function ShapeMarks({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-end gap-3", className)}>
      <svg
        viewBox="0 0 24 24"
        className="text-shape-1 size-7 motion-safe:animate-[shape-bob_2.6s_ease-in-out_3]"
      >
        <circle cx="12" cy="12" r="11" fill="currentColor" />
      </svg>
      <svg
        viewBox="0 0 26 24"
        className="text-shape-3 mb-2 size-8 motion-safe:animate-[shape-bob_2.6s_ease-in-out_-0.9s_3]"
      >
        <path d="M13 1 25 23H1Z" fill="currentColor" strokeLinejoin="round" />
      </svg>
      <svg
        viewBox="0 0 44 18"
        className="text-shape-2 h-5 w-12 motion-safe:animate-[shape-bob_2.6s_ease-in-out_-1.7s_3]"
      >
        <path
          d="M3 9q6-8 12 0t12 0t12 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

const SHAPE_COLOURS = [
  "text-shape-1",
  "text-shape-2",
  "text-shape-3",
  "text-shape-4",
];

/**
 * One shape from the set, as a small marker beside an item in a list (the run view's running
 * order): circle, triangle, squiggle in turn, in the shape colours in turn.
 */
export function ShapeMark({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  const colour = SHAPE_COLOURS[index % SHAPE_COLOURS.length];
  const shape = index % 3;
  return (
    <svg
      aria-hidden
      viewBox={shape === 2 ? "0 0 44 18" : "0 0 24 24"}
      className={cn("size-3.5 shrink-0", colour, className)}
    >
      {shape === 0 ? (
        <circle cx="12" cy="12" r="10" fill="currentColor" />
      ) : shape === 1 ? (
        <path d="M12 2 23 22H1Z" fill="currentColor" />
      ) : (
        <path
          d="M3 9q6-8 12 0t12 0t12 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
