import { cn } from "~/lib/utils";

/**
 * The show's shape set (a circle, a triangle and a squiggle) as a small mark over a quiet
 * screen: waiting for an award, voting closed. The same shapes as the confetti, in the theme's
 * shape colours. They bob gently, unless motion is reduced.
 */
export function ShapeMarks({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-end gap-3", className)}>
      <svg
        viewBox="0 0 24 24"
        className="text-shape-1 size-7 motion-safe:animate-[shape-bob_2.6s_ease-in-out_infinite]"
      >
        <circle cx="12" cy="12" r="11" fill="currentColor" />
      </svg>
      <svg
        viewBox="0 0 26 24"
        className="text-shape-3 mb-2 size-8 motion-safe:animate-[shape-bob_2.6s_ease-in-out_-0.9s_infinite]"
      >
        <path d="M13 1 25 23H1Z" fill="currentColor" strokeLinejoin="round" />
      </svg>
      <svg
        viewBox="0 0 44 18"
        className="text-shape-2 h-5 w-12 motion-safe:animate-[shape-bob_2.6s_ease-in-out_-1.7s_infinite]"
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
