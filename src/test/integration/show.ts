import { type AnyProcedure } from "@trpc/server";

import { appRouter } from "~/server/api/root";

import { testDb } from "./db";
import { type Visitor, visitor } from "./visitor";

export const FILMS = ["Dune", "Barbie", "Oppenheimer"];

/**
 * A show as a host builds it: a normal category, a top-2 ranking category (each with three
 * films), and an aggregate category of both. The host keeps the manage cookie from creating it.
 */
export async function createShow(host: Visitor, { password = "" } = {}) {
  const show = await host.api.createSession({
    name: "Movie Awards",
    password,
  });
  type CategoryInput = Parameters<Visitor["api"]["addCategory"]>[0];
  const addCategory = (category: Omit<CategoryInput, "sessionId">) =>
    host.api.addCategory({ sessionId: show.id, ...category });
  const addNomination = (
    nomination: Parameters<Visitor["api"]["addNomination"]>[0],
  ) => host.api.addNomination(nomination);
  const addFilms = (categoryId: string) =>
    Promise.all(FILMS.map(name => addNomination({ categoryId, name })));

  const [normal, ranking] = await Promise.all([
    addCategory({ name: "Best Film", type: "NORMAL", sourceCategories: [] }),
    addCategory({
      name: "Top Films",
      type: "RANKING",
      rankingTop: 2,
      sourceCategories: [],
    }),
  ]);
  const [normalFilms, rankingFilms] = await Promise.all([
    addFilms(normal.id),
    addFilms(ranking.id),
  ]);
  // Created last, so it copies the films from its sources
  const aggregate = await addCategory({
    name: "Overall",
    type: "AGGREGATE",
    sourceCategories: [normal.id, ranking.id],
  });

  /** A nomination by film name, in the normal or ranking category */
  const film = (category: "normal" | "ranking", name: string) =>
    (category === "normal" ? normalFilms : rankingFilms).find(
      n => n.name === name,
    )!;

  return {
    show,
    normal,
    ranking,
    aggregate,
    film,
    addCategory,
    addNomination,
  };
}

export type Show = Awaited<ReturnType<typeof createShow>>;

/** Opens a category for voting, as the host */
export const open = (host: Visitor, categoryId: string) =>
  host.api.setActiveCategory({ categoryId, active: true });

/** Reveals a category's results (or hides them again), as the host */
export const reveal = (host: Visitor, categoryId: string, revealed = true) =>
  host.api.setCategoryRevealed({ id: categoryId, revealed });

/** A show with a vote for Dune in the normal category, and a ranking (Dune, Barbie), from one voter */
export async function votedShow({ password = "" } = {}) {
  const host = visitor();
  const voter = visitor();
  const show = await createShow(host, { password });
  await open(host, show.normal.id);
  await voter.api.vote({ nominationId: show.film("normal", "Dune").id });
  await open(host, show.ranking.id);
  await voter.api.submitRanking({
    categoryId: show.ranking.id,
    rankings: [
      { nominationId: show.film("ranking", "Dune").id, rank: 1 },
      { nominationId: show.film("ranking", "Barbie").id, rank: 2 },
    ],
  });
  return { host, voter, show };
}

/** Everything in the database for one show, to check whether a request changed it */
export const showState = async (sessionId: string) => {
  const [session, categories, nominations, votes] = await Promise.all([
    testDb.session.findUnique({ where: { id: sessionId } }),
    testDb.category.findMany({ where: { sessionId }, orderBy: { id: "asc" } }),
    testDb.nomination.findMany({
      where: { category: { sessionId } },
      orderBy: { id: "asc" },
    }),
    testDb.vote.findMany({
      where: { nomination: { category: { sessionId } } },
      orderBy: { id: "asc" },
    }),
  ]);
  return { session, categories, nominations, votes };
};

/** The paths of the API's procedures of one type, such as `award.vote` */
export const procedureNames = (type: "query" | "mutation") =>
  Object.entries(
    // The type describes the nested routers, but at runtime the paths are flat
    appRouter._def.procedures as unknown as Record<string, AnyProcedure>,
  )
    .filter(([, procedure]) => procedure._def.type === type)
    .map(([path]) => path)
    .sort();

/** The paths of the award router's procedures with these names */
export const awardPaths = (names: string[]) =>
  names.map(name => `award.${name}`).sort();

/** Each nomination's score, by name */
export const scoresByName = (
  nominations: { name: string; _count: { votes: number } }[],
) => Object.fromEntries(nominations.map(n => [n.name, n._count.votes]));
