import { type CategoryType } from "~/generated/prisma/enums";

type ScoredCategory = { type: CategoryType; rankingTop: number | null };
/**
 * A nomination as loaded for scoring: how many votes it has, and the ranks of its ranked votes.
 * Votes without a rank may be left out of `votes`, since they earn no ranking points.
 */
type ScoredNomination = {
  name: string;
  _count: { votes: number };
  votes: { rank: number | null }[];
};
/** A nomination in one of an aggregate category's source categories */
type SourceNomination = ScoredNomination & { category: ScoredCategory };

/** Points for one ranking vote: 1st place = rankingTop points, 2nd = rankingTop − 1, … */
const calculatePoints = (rank: number, rankingTop: number) =>
  rankingTop - rank + 1;

/**
 * A nomination's score from its own votes. In a ranking category each vote earns points by its
 * rank, and votes without a rank earn nothing. In every other category each vote is 1 point.
 */
const scoreVotes = (
  { type, rankingTop }: ScoredCategory,
  nomination: ScoredNomination,
) =>
  type === "RANKING" && rankingTop
    ? nomination.votes.reduce(
        (sum, { rank }) =>
          rank ? sum + calculatePoints(rank, rankingTop) : sum,
        0,
      )
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
  nominations: { _count: { votes: number } }[],
): number {
  const total = nominations.reduce((sum, n) => sum + n._count.votes, 0);
  const { rankingTop } = category;
  if (category.type !== "RANKING" || !rankingTop) return total;

  let pointsPerBallot = 0;
  for (let rank = 1; rank <= rankingTop; rank++) {
    pointsPerBallot += calculatePoints(rank, rankingTop);
  }
  return Math.round(total / pointsPerBallot);
}
