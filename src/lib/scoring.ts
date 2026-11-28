import { type CategoryType } from "~/generated/prisma/enums";

export type ScoredCategory = { type: CategoryType; rankingTop: number | null };
/** A nomination's votes that have a rank: how many, and their ranks added up */
export type RankedVotes = { count: number; rankSum: number };
export const NO_RANKED_VOTES: RankedVotes = { count: 0, rankSum: 0 };

/**
 * A nomination as loaded for scoring: how many votes it has, and, in a ranking category, its
 * ranked votes added up (by the database, so the votes themselves aren't loaded)
 */
export type ScoredNomination = {
  name: string;
  _count: { votes: number };
  ranked: RankedVotes;
};
/** A nomination in one of an aggregate category's source categories */
export type SourceNomination = ScoredNomination & { category: ScoredCategory };

/** Whether a category's votes earn ranking points (a ranking category without a top N counts votes) */
export const earnsRankingPoints = (
  category: ScoredCategory,
): category is ScoredCategory & { rankingTop: number } =>
  category.type === "RANKING" && !!category.rankingTop;

/** Points for one ranking vote: 1st place = rankingTop points, 2nd = rankingTop − 1, … */
const calculatePoints = (rank: number, rankingTop: number) =>
  rankingTop - rank + 1;

/**
 * A nomination's score from its own votes. In a ranking category each vote earns points by its
 * rank (`calculatePoints`), and votes without a rank earn nothing. Adding up `rankingTop − rank
 * + 1` over the ranked votes is `count × (rankingTop + 1) − the sum of their ranks`, so the
 * count and the sum are all it needs. In every other category each vote is 1 point.
 */
const scoreVotes = (category: ScoredCategory, nomination: ScoredNomination) =>
  earnsRankingPoints(category)
    ? nomination.ranked.count * (category.rankingTop + 1) -
      nomination.ranked.rankSum
    : nomination._count.votes;

/**
 * A nomination's score. In an aggregate category it's the sum of the scores of the source
 * nominations with the same name; `sourceNominations` may hold other names too. In every other
 * category it comes from the nomination's own votes.
 */
export function scoreNomination(
  category: ScoredCategory,
  nomination: ScoredNomination,
  sourceNominations: SourceNomination[] = [],
): number {
  if (category.type !== "AGGREGATE") return scoreVotes(category, nomination);

  return sourceNominations
    .filter(source => source.name === nomination.name)
    .reduce((sum, source) => sum + scoreVotes(source.category, source), 0);
}

/**
 * How many people voted in a category, from its nominations' scores. In a ranking category every
 * full ballot hands out the same points (rankingTop + … + 2 + 1), so this is an estimate.
 */
export function estimateVoters(
  category: ScoredCategory,
  scores: number[],
): number {
  const total = scores.reduce((sum, score) => sum + score, 0);
  const { rankingTop } = category;
  if (category.type !== "RANKING" || !rankingTop) return total;

  let pointsPerBallot = 0;
  for (let rank = 1; rank <= rankingTop; rank++) {
    pointsPerBallot += calculatePoints(rank, rankingTop);
  }
  return Math.round(total / pointsPerBallot);
}

/** A category with its sources' types, enough to know what its scores count */
export type LabelledCategory = ScoredCategory & {
  sourceCategories: ScoredCategory[];
};

/**
 * "points" or "votes" for a nomination's score. Ranking scores are points, and so are an
 * aggregate's when any of its sources is a ranking category: one ranking can give a nomination
 * several points.
 */
export const getScoreLabel = (category: LabelledCategory, count: number) => {
  const isPoints =
    earnsRankingPoints(category) ||
    (category.type === "AGGREGATE" &&
      category.sourceCategories.some(earnsRankingPoints));
  if (isPoints) return count === 1 ? "point" : "points";
  return count === 1 ? "vote" : "votes";
};

/** What a category shows once it's revealed */
export type RevealOptions = {
  revealed: boolean;
  winnerOnly: boolean;
  hideVoteCounts: boolean;
};

/** A nomination's score as someone sees it */
export type VisibleScore = {
  /** Its votes, or points in ranking and aggregate categories. Null when it's hidden. */
  score: number | null;
  /**
   * 1 for the highest score, 2 for the next one, and so on; ties share a place. Null for a
   * nomination without votes (or points), and when it's hidden.
   */
  place: number | null;
};

/** Each score's place: 1 for the highest, 2 for the next different one, …, and none for 0 */
const placesOf = (scores: number[]) => {
  const distinct = [...new Set(scores.filter(score => score > 0))].sort(
    (a, b) => b - a,
  );
  return scores.map(score => (score > 0 ? distinct.indexOf(score) + 1 : null));
};

/**
 * The nominations' scores as someone sees them. Hosts (`"all"`) see every score. Everyone else
 * sees what the category reveals:
 * - before the reveal, nothing;
 * - with `winnerOnly`, only the winners;
 * - with `hideVoteCounts`, only the places, without the scores.
 */
export const visibleScores = (
  shown: RevealOptions | "all",
  scores: number[],
): VisibleScore[] => {
  const places = placesOf(scores);
  return scores.map((score, i) => {
    const place = places[i] ?? null;
    if (shown === "all") return { score, place };
    if (!shown.revealed || (shown.winnerOnly && place !== 1)) {
      return { score: null, place: null };
    }
    return { score: shown.hideVoteCounts ? null : score, place };
  });
};
