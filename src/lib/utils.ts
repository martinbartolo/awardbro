import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Knows the design's own radius and shadow names, so they replace the defaults they override */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { radius: ["panel", "inner"], shadow: ["soft", "lift"] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"] as const;
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? "th";
  return `${n}${suffix}`;
}

/** Lists names as "A, B and C" */
export const listFormat = new Intl.ListFormat("en");
