/**
 * The big screen's podium: which nominations stand on it, where, how tall, and in which colour.
 * Pure, so every screen and every reload agrees.
 */

/** A nomination as the big screen sees it once its category is revealed */
type PodiumNomination = {
  id: string;
  /** Null when the show hides it */
  score: number | null;
  /** 1 for the winners; null without votes, or when the show hides it */
  place: number | null;
};

/** How many column colours there are (`--column-1` to `--column-7`), and so the most columns */
const COLUMN_COLOURS = 7;
/** Past seven nominations, the top five get columns and the rest share one block */
const TOP_COLUMNS = 5;
/** The shortest column, as a share of the tallest, so a nomination without votes still shows */
export const MIN_HEIGHT = 0.14;
/** Without scores, each place down is this much shorter */
const PLACE_STEP = 0.17;

/** A number from a string, the same every time (cyrb53) */
function hash(text: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** 0, 1, …, n − 1 shuffled with `seed`: looks random, but is the same for the same seed */
export function seededOrder(seed: string, n: number): number[] {
  // mulberry32
  let state = hash(seed) >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/**
 * Each column's colour, 1 to 7 (`--column-<n>`), by nomination id. The palette is shuffled with
 * the category as the seed, and each nomination takes the next colour in the category's own
 * order, so a nomination keeps its colour whatever its score. Columns don't share a colour: a
 * nomination whose colour is taken (past seven nominations) takes the next free one. Only a tie
 * of more than seven winners repeats one, and those all turn the winner colour.
 */
export function columnColours(
  categoryId: string,
  /** Every nomination in the category, in its own (stable) order */
  nominationIds: string[],
  /** The nominations that get a column */
  shownIds: Set<string>,
): Map<string, number> {
  const palette = seededOrder(categoryId, COLUMN_COLOURS);
  const colours = new Map<string, number>();
  const used = new Set<number>();
  nominationIds.forEach((id, index) => {
    if (!shownIds.has(id)) return;
    for (let step = 0; step < COLUMN_COLOURS; step++) {
      const colour = palette[(index + step) % COLUMN_COLOURS]! + 1;
      if (!used.has(colour) || step === COLUMN_COLOURS - 1) {
        used.add(colour);
        colours.set(id, colour);
        return;
      }
    }
  });
  return colours;
}

/**
 * Where each column stands, from left to right, by its index in the results (0 is the winner):
 * the winner in the middle, 2nd and 3rd stepping down to its left, the rest to its right. Five
 * columns stand 3rd, 2nd, 1st, 4th, 5th.
 */
export function podiumSlots(count: number): number[] {
  const left = Math.ceil((count - 1) / 2);
  const slots: number[] = [];
  for (let i = left; i >= 1; i--) slots.push(i);
  if (count > 0) slots.push(0);
  for (let i = left + 1; i < count; i++) slots.push(i);
  return slots;
}

type Podium<T extends PodiumNomination> = {
  /** Every nomination with a column, best first */
  columns: (T & { winner: boolean; height: number; slot: number })[];
  /** Past seven nominations, the ones without a column, best first */
  rest: T[];
  /** Ties share first place, so there can be several */
  winners: T[];
};

/**
 * The podium for a revealed category's nominations, as the big screen gets them. Best first;
 * nominations without a place (no votes, or hidden by "winner only") last, in their own order.
 * With `winnerOnly`, only the winners stand on it.
 */
export function podium<T extends PodiumNomination>(
  nominations: T[],
  { winnerOnly }: { winnerOnly: boolean },
): Podium<T> {
  const ranked = nominations
    .map((nomination, index) => ({ nomination, index }))
    .sort(
      (a, b) =>
        (a.nomination.place ?? Infinity) - (b.nomination.place ?? Infinity) ||
        a.index - b.index,
    )
    .map(({ nomination }) => nomination);
  const winners = ranked.filter(n => n.place === 1);
  const candidates = winnerOnly ? winners : ranked;

  // Every winner stands on the podium, even past seven (they share the winner colour anyway)
  const columnCount =
    candidates.length <= COLUMN_COLOURS
      ? candidates.length
      : Math.max(TOP_COLUMNS, winners.length);
  const standing = candidates.slice(0, columnCount);
  const rest = candidates.slice(columnCount);

  const best = Math.max(0, ...standing.map(n => n.score ?? 0));
  const scoresShown = standing.some(n => n.score !== null);
  const height = (n: T) => {
    if (scoresShown) {
      return best > 0
        ? Math.max(MIN_HEIGHT, (n.score ?? 0) / best)
        : MIN_HEIGHT;
    }
    if (n.place === null) return MIN_HEIGHT;
    return Math.max(MIN_HEIGHT * 2, 1 - (n.place - 1) * PLACE_STEP);
  };

  const slots = podiumSlots(standing.length);
  return {
    columns: standing.map((n, index) => ({
      ...n,
      winner: n.place === 1,
      height: height(n),
      slot: slots.indexOf(index),
    })),
    rest,
    winners,
  };
}

/**
 * The order the columns rise in at the reveal: runners-up from the shortest up, then the winners
 * together, last.
 */
export function riseOrder<T extends { winner: boolean; height: number }>(
  columns: T[],
): T[] {
  return [
    ...columns.filter(c => !c.winner).sort((a, b) => a.height - b.height),
    ...columns.filter(c => c.winner),
  ];
}
