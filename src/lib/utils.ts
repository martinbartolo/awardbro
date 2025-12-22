import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { type CategoryType } from "~/generated/prisma/enums";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the appropriate label for vote/point count based on category type
 */
export function getScoreLabel(
  categoryType: CategoryType,
  count: number,
): string {
  if (categoryType === "RANKING") {
    return count === 1 ? "point" : "points";
  }
  return count === 1 ? "vote" : "votes";
}

/**
 * Calculate points for a ranking vote based on position
 * Uses inverse linear scoring: 1st place = rankingTop pts, 2nd = rankingTop-1, etc.
 */
export function calculatePoints(rank: number, rankingTop: number): number {
  return rankingTop - rank + 1;
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
