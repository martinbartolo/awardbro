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

type Ranking = { nominationId: string; rank: number | null };

/**
 * Whether two rankings place the same nominations at the same ranks, in any order
 */
export function isSameRanking(a: Ranking[], b: Ranking[]): boolean {
  return (
    a.length === b.length &&
    a.every(x =>
      b.some(y => y.nominationId === x.nominationId && y.rank === x.rank),
    )
  );
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
