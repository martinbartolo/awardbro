import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
