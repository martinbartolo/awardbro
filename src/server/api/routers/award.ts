import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { type CategoryType, Prisma } from "~/generated/prisma/client";
import { imageAddress, parseImageLink } from "~/lib/images";
import { normalizeRoomCode } from "~/lib/join";
import {
  categoryFormSchema,
  categoryUpdateSchema,
  nominationFormSchema,
  nominationUpdateSchema,
  normalizePassword,
  rankingSubmissionSchema,
  sessionFormSchema,
} from "~/lib/schemas";
import {
  earnsRankingPoints,
  estimateVoters,
  NO_RANKED_VOTES,
  type RankedVotes,
  type RevealOptions,
  type ScoredCategory,
  type ScoredNomination,
  scoreNomination,
  type SourceNomination,
  visibleScores,
} from "~/lib/scoring";
import {
  SERVER_STAGES,
  STAGE_FLAGS,
  stageOf,
  STAGES,
  votingHasClosed,
} from "~/lib/stages";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  clearLoginAttempts,
  countLoginAttempt,
  loginClient,
} from "~/server/auth/login-attempts";
import { assertCanManage, isHost } from "~/server/auth/manage";
import { setManageCookie } from "~/server/auth/manage-token";
import { DEVICE_ID_COOKIE, getCookie } from "~/server/cookies";
import { type db } from "~/server/db";
import { notifyShow, type ShowEvent } from "~/server/events";

/**
 * What to load with each nomination to score it: its vote count. A ranking category's ranked
 * votes are added up by the database separately (`withScores`), so no votes are loaded.
 */
const scoringFields = { _count: { select: { votes: true } } } as const;

/** A nomination as loaded for scoring, before its ranked votes are added up */
type LoadedNomination = Omit<ScoredNomination, "ranked"> & { id: string };

/**
 * What a category reveals to someone who can't manage the show. An aggregate is made of its
 * sources' scores, so it reveals no more than they do: nothing until every source is revealed,
 * only the order if any source hides its counts or shows only its winner, and only its winners
 * if any source shows only its winner. Otherwise its own
 * totals minus one source's would give another source's hidden scores.
 */
const revealOptions = (
  category: RevealOptions & {
    type: CategoryType;
    sourceCategories: RevealOptions[];
  },
): RevealOptions =>
  category.type !== "AGGREGATE"
    ? category
    : {
        revealed:
          category.revealed &&
          category.sourceCategories.every(source => source.revealed),
        winnerOnly:
          category.winnerOnly ||
          category.sourceCategories.some(source => source.winnerOnly),
        hideVoteCounts:
          category.hideVoteCounts ||
          category.sourceCategories.some(
            source => source.hideVoteCounts || source.winnerOnly,
          ),
      };

/**
 * Categories in the show's running order. Positions only tie if code from before them added a
 * category: while the release that added them was building, or after a rollback. Age then keeps
 * the order stable, and the next move renumbers them.
 */
const runningOrder = [
  { position: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
] satisfies Prisma.CategoryOrderByWithRelationInput[];

/** A category as loaded for scoring, with its sources when it's an aggregate */
type ScorableCategory = ScoredCategory &
  RevealOptions & {
    id: string;
    sourceCategories: (ScoredCategory & RevealOptions & { id: string })[];
    nominations: LoadedNomination[];
  };

/**
 * The categories, with each nomination's `score` and `place` (`VisibleScore`) instead of its
 * votes, so individual votes are never sent.
 *
 * With `canSeeAllScores` (hosts) every score is sent; otherwise only what the show reveals
 * (`visibleScores` with `revealOptions`).
 *
 * An aggregate is scored from its sources' nominations. Sources among `categories` are used as
 * loaded; any others are loaded in one query for all aggregates. Ranking categories' ranked
 * votes are added up in another, one row per nomination, at the same time. So scoring takes at
 * most two queries beyond loading the categories, in one round trip, however many there are.
 * They aren't in a transaction with it, so a vote saved in between can show in some scores and
 * not others; the live event that vote sends makes the page fetch them all again.
 */
const withScores = async <C extends ScorableCategory>(
  client: typeof db,
  categories: C[],
  canSeeAllScores: boolean,
) => {
  /** Each category's nominations, by category ID */
  const nominationsOf = new Map<string, LoadedNomination[]>(
    categories.map(category => [category.id, category.nominations]),
  );
  const aggregates = categories.filter(c => c.type === "AGGREGATE");
  const missingSourceIds = [
    ...new Set(
      aggregates.flatMap(a => a.sourceCategories.map(source => source.id)),
    ),
  ].filter(id => !nominationsOf.has(id));
  const names = [
    ...new Set(aggregates.flatMap(a => a.nominations.map(n => n.name))),
  ];
  // Every category whose votes earn ranking points, among these and their sources: known before
  // any query, so their ranked votes are added up at the same time as the sources are loaded
  const rankingCategoryIds = [
    ...new Set(
      [...categories, ...aggregates.flatMap(a => a.sourceCategories)]
        .filter(earnsRankingPoints)
        .map(c => c.id),
    ),
  ];
  const [fetched, rankedRows] = await Promise.all([
    missingSourceIds.length && names.length
      ? client.nomination.findMany({
          where: { categoryId: { in: missingSourceIds }, name: { in: names } },
          select: { id: true, categoryId: true, name: true, ...scoringFields },
        })
      : [],
    rankingCategoryIds.length
      ? client.vote.groupBy({
          by: ["nominationId"],
          where: {
            nomination: { categoryId: { in: rankingCategoryIds } },
            rank: { not: null },
          },
          _count: { _all: true },
          _sum: { rank: true },
        })
      : [],
  ]);
  for (const nomination of fetched) {
    const list = nominationsOf.get(nomination.categoryId);
    if (list) list.push(nomination);
    else nominationsOf.set(nomination.categoryId, [nomination]);
  }
  /** Each nomination's ranked votes, added up by the database (none: not in a ranking category) */
  const rankedOf = new Map<string, RankedVotes>(
    rankedRows.map(row => [
      row.nominationId,
      { count: row._count._all, rankSum: row._sum.rank ?? 0 },
    ]),
  );
  const scored = (nomination: LoadedNomination): ScoredNomination => ({
    ...nomination,
    ranked: rankedOf.get(nomination.id) ?? NO_RANKED_VOTES,
  });

  /** An aggregate's source nominations, with the source each is in, grouped by name */
  const sourcesByName = (category: C) => {
    const byName = new Map<string, SourceNomination[]>();
    for (const source of category.sourceCategories) {
      for (const nomination of nominationsOf.get(source.id) ?? []) {
        const withSource = { ...scored(nomination), category: source };
        const list = byName.get(nomination.name);
        if (list) list.push(withSource);
        else byName.set(nomination.name, [withSource]);
      }
    }
    return byName;
  };

  return categories.map(category => {
    const sources =
      category.type === "AGGREGATE" ? sourcesByName(category) : undefined;
    const scores = category.nominations.map(nomination =>
      scoreNomination(
        category,
        scored(nomination),
        sources?.get(nomination.name),
      ),
    );
    const reveals = revealOptions(category);
    const shown = visibleScores(canSeeAllScores ? "all" : reveals, scores);
    const { nominations, ...rest } = category;
    return {
      ...rest,
      nominations: nominations.map(
        ({ _count, ...nomination }: C["nominations"][number], i) => ({
          ...nomination,
          ...shown[i]!,
        }),
      ),
      // What the audience sees of it: an aggregate reveals no more than its sources
      reveals,
      // The present page's live count while voting is open, so public until the reveal. After
      // it, the total next to masked scores would give hidden ones away (a loser's score is
      // the total minus the winner's), so only hosts get it. An aggregate's would mix votes and
      // points, so it has none.
      estimatedVoters:
        category.type === "AGGREGATE" || (!canSeeAllScores && category.revealed)
          ? null
          : estimateVoters(category, scores),
    };
  });
};

const SALT_ROUNDS = 10;
/*
 * Each show has an advisory lock that keeps votes and host actions apart.
 * Saving a vote takes it shared, so voters don't block each other. Host
 * actions that change what can be voted on or delete votes (switching or
 * stopping a category, resets, deletes) take it exclusively: they wait for
 * votes already being saved, and votes arriving meanwhile wait for them.
 * Postgres queues these locks fairly, so a stream of votes can't starve the
 * host. The key is a bigint, which keeps it apart from the two-int device lock.
 */

/** No connection or lock in time (P2028), or a transaction conflict (P2034) */
const isBusy = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2028" || error.code === "P2034");

const hostBusy = () =>
  new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Couldn't save that change just now. Please try again.",
  });

/** Turns an error from a host's transaction into one for the client */
const hostWriteError = (error: unknown, message: string) => {
  if (error instanceof TRPCError) return error;
  if (isBusy(error)) return hostBusy();
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
};

/**
 * Runs a host's write in one transaction that holds the show's lock exclusively (see above), and
 * tells the show's open pages once it commits (see events.ts). The lock and the notification are
 * one statement, so this costs no extra round trip. Errors become ones for the client, with
 * `failure` as the message of an unexpected one.
 */
const hostWrite = async <T>(
  client: typeof db,
  sessionId: string,
  event: ShowEvent,
  failure: string,
  write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  try {
    return await client.$transaction(
      async tx => {
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${sessionId}, 0)), ${notifyShow(sessionId, event)}`;
        return write(tx);
      },
      { maxWait: 5000, timeout: 10000 },
    );
  } catch (error) {
    throw hostWriteError(error, failure);
  }
};

/**
 * Refuses a nomination that isn't valid in its category, and returns the description to store.
 * An image category needs a picture link, stored as the address the picture loads from (a share
 * link becomes the picture's own address; whether it opens is only checked by the host's browser,
 * never fetched here). No category takes a repeat. The same name and description twice
 * is an accidental double-add. The same name with a different description (or image) is allowed:
 * hosts use it on purpose. Names are compared ignoring case, which is stricter than aggregates
 * (they match exact names). Compared here rather than in SQL: older rows may have untrimmed text.
 */
const assertValidNomination = async (
  tx: Prisma.TransactionClient,
  nomination: {
    categoryId: string;
    categoryType: CategoryType;
    name: string;
    description?: string;
    /** The nomination being edited, which can't repeat itself */
    exceptId?: string;
  },
) => {
  const { name, categoryType, exceptId } = nomination;
  const isImage = categoryType === "IMAGE";
  // An image category's description is a picture link, stored as the address the picture loads
  // from (see parseImageLink), so a share link and the address it leads to are the same picture
  let description = nomination.description ?? "";
  if (isImage) {
    const parsed = parseImageLink(description);
    if ("error" in parsed) {
      throw new TRPCError({ code: "BAD_REQUEST", message: parsed.error });
    }
    description = parsed.url;
  }
  /** A stored description as it compares with this one */
  const comparable = (text: string | null) =>
    (isImage ? imageAddress(text ?? "") : null) ?? (text ?? "").trim();
  const existing = await tx.nomination.findMany({
    where: {
      categoryId: nomination.categoryId,
      id: exceptId ? { not: exceptId } : undefined,
    },
    select: { name: true, description: true },
  });
  const repeated = existing.some(
    n =>
      n.name.trim().toLowerCase() === name.toLowerCase() &&
      comparable(n.description) === description,
  );
  if (repeated) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: !description
        ? `"${name}" is already in this category`
        : categoryType === "IMAGE"
          ? `"${name}" with this image is already in this category`
          : `"${name}" with this description is already in this category`,
    });
  }
  // What to store as the description
  return isImage ? description : nomination.description;
};

/**
 * Refuses aggregate sources that aren't non-aggregate categories of this show. Call it holding
 * the show's lock, so a source can't be deleted between the check and the link.
 */
const assertValidSources = async (
  tx: Prisma.TransactionClient,
  sessionId: string,
  sourceIds: string[],
) => {
  const validSources = await tx.category.count({
    where: { id: { in: sourceIds }, sessionId, type: { not: "AGGREGATE" } },
  });
  if (validSources !== sourceIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Source categories must be non-aggregate categories in this show",
    });
  }
};

/**
 * Brings an aggregate's nominations in line with its sources. Aggregates match source nominations
 * by exact name and keep one copy per name, with the description of the first one added. Copies of
 * names no source has any more are removed; aggregates take no votes, so none are lost.
 *
 * With `names`, only copies of those names are touched: a host may have deleted an aggregate's
 * copy on purpose, and adding or editing an unrelated nomination shouldn't bring it back.
 *
 * Call it holding the show's lock, so two changes can't copy the same name twice.
 */
const reconcileAggregate = async (
  tx: Prisma.TransactionClient,
  aggregateId: string,
  sourceIds: string[],
  names?: string[],
) => {
  const name = names ? { in: names } : undefined;
  const [wanted, copies] = await Promise.all([
    tx.nomination.findMany({
      where: { categoryId: { in: sourceIds }, name },
      distinct: ["name"],
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      select: { name: true, description: true },
    }),
    tx.nomination.findMany({
      where: { categoryId: aggregateId, name },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, description: true },
    }),
  ]);
  const wantedDescription = new Map(wanted.map(n => [n.name, n.description]));
  // The oldest copy of each name stays (if the name is still wanted); any others go
  const kept = new Map<string, (typeof copies)[number]>();
  const stale: string[] = [];
  for (const copy of copies) {
    if (wantedDescription.has(copy.name) && !kept.has(copy.name)) {
      kept.set(copy.name, copy);
    } else {
      stale.push(copy.id);
    }
  }

  let missing = wanted.filter(n => !kept.has(n.name));
  // A rename (one name gone, one new): rename the copy, so it keeps its place in the list
  if (names && stale.length === 1 && missing.length === 1) {
    await tx.nomination.update({
      where: { id: stale.pop() },
      data: missing[0]!,
    });
    missing = [];
  }
  if (stale.length) {
    await tx.nomination.deleteMany({ where: { id: { in: stale } } });
  }
  if (missing.length) {
    await tx.nomination.createMany({
      data: missing.map(n => ({ ...n, categoryId: aggregateId })),
    });
  }
  for (const copy of kept.values()) {
    const description = wantedDescription.get(copy.name);
    if (copy.description !== description) {
      await tx.nomination.update({
        where: { id: copy.id },
        data: { description },
      });
    }
  }
};

/** The aggregates that use a category as a source, with all their sources */
const aggregatesOf = (tx: Prisma.TransactionClient, categoryId: string) =>
  tx.category.findMany({
    where: { sourceCategories: { some: { id: categoryId } } },
    select: {
      id: true,
      name: true,
      sourceCategories: { select: { id: true } },
    },
  });

/** Reconciles these names in every aggregate that uses the category (see reconcileAggregate) */
const reconcileAggregatesOf = async (
  tx: Prisma.TransactionClient,
  aggregates: Awaited<ReturnType<typeof aggregatesOf>>,
  names: string[],
) => {
  for (const aggregate of aggregates) {
    await reconcileAggregate(
      tx,
      aggregate.id,
      aggregate.sourceCategories.map(s => s.id),
      names,
    );
  }
};

/**
 * Refuses a vote in a category that isn't open: not active, closed by the
 * host, or already revealed (so the results on the big screen can't change).
 */
const assertVotingOpen = (
  category:
    { isActive: boolean; votingClosed: boolean; revealed: boolean } | undefined,
) => {
  if (!category?.isActive) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Voting is not currently active for this category",
    });
  }
  if (votingHasClosed(category)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Voting has closed for this category",
    });
  }
};

/**
 * Saves a voter's vote or ranking in one transaction that holds the show's
 * lock shared (see above) and a lock on the device and category, so
 * simultaneous requests from the same device take turns. It then checks the
 * category is still open and the nominations still exist, and replaces the
 * device's previous vote, so a failure leaves the previous vote in place.
 */
const saveVote = async <T>(
  client: typeof db,
  target: {
    deviceId: string;
    sessionId: string;
    categoryId: string;
    nominationIds: string[];
    /** For a ranking: the number of places it was checked against */
    rankingTop?: number;
  },
  write: (tx: Prisma.TransactionClient) => Promise<T>,
) => {
  const { deviceId, sessionId, categoryId, nominationIds } = target;
  try {
    return await client.$transaction(
      async tx => {
        // Show lock first, then the device lock, always in this order
        // With the notification for the show's pages, sent only if the vote commits (events.ts)
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock_shared(hashtextextended(${sessionId}, 0)), ${notifyShow(sessionId, { type: "votes", categoryId })}`;
        const [category] = await tx.$queryRaw<
          {
            isActive: boolean;
            votingClosed: boolean;
            revealed: boolean;
            rankingTop: number | null;
          }[]
        >`
          SELECT c."isActive", c."votingClosed", c."revealed", c."rankingTop"
          FROM pg_advisory_xact_lock(hashtext(${deviceId}), hashtext(${categoryId})),
            "Category" c
          WHERE c."id" = ${categoryId}`;
        assertVotingOpen(category);
        // The host may have changed the number of places since the ranking was checked
        if (
          target.rankingTop !== undefined &&
          category?.rankingTop !== target.rankingTop
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "The number of places to rank has changed. Please reload the page.",
          });
        }
        const found = await tx.nomination.count({
          where: { id: { in: nominationIds }, categoryId },
        });
        if (found !== nominationIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A nomination was removed. Please reload the page.",
          });
        }
        await tx.vote.deleteMany({
          where: { deviceId, nomination: { categoryId } },
        });
        return write(tx);
      },
      { maxWait: 5000, timeout: 10000 },
    );
  } catch (error) {
    if (isBusy(error)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Couldn't save your vote just now. Please try again.",
      });
    }
    throw error;
  }
};

export const awardRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(sessionFormSchema)
    .mutation(async ({ ctx, input }) => {
      const password = await bcrypt.hash(
        normalizePassword(input.password),
        SALT_ROUNDS,
      );
      try {
        // The database picks the room code (the column's default, generate_room_code())
        const session = await ctx.db.session.create({
          data: { name: input.name, password },
          select: { id: true, name: true, code: true },
        });
        // The creator can manage the show straight away without re-entering the password
        setManageCookie(ctx.resHeaders, session.id);
        return session;
      } catch (error) {
        if (isBusy(error)) throw hostBusy();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create session",
          cause: error,
        });
      }
    }),

  /**
   * Finds the show with the room code someone typed on the homepage, ignoring case and spaces.
   * Returns only its code.
   */
  findShow: publicProcedure
    .input(z.object({ code: z.string().trim().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const show = await ctx.db.session.findUnique({
        where: { code: normalizeRoomCode(input.code) },
        select: { code: true },
      });
      if (!show) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No show has that code",
        });
      }
      return show;
    }),

  /**
   * What the vote page needs: the show's name and the category on the big screen, with its
   * nominations, and no scores.
   */
  getActiveCategory: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const show = await ctx.db.session.findUnique({
        where: { code: input.code },
        select: {
          name: true,
          categories: {
            // At most one is on the big screen
            where: { isActive: true },
            orderBy: runningOrder,
            take: 1,
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              rankingTop: true,
              isActive: true,
              votingClosed: true,
              revealed: true,
              aggregateOf: {
                orderBy: runningOrder,
                select: { id: true, name: true },
              },
              nominations: {
                orderBy: { createdAt: "asc" },
                select: { id: true, name: true, description: true },
              },
            },
          },
        },
      });
      if (!show) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }
      return { name: show.name, category: show.categories[0] ?? null };
    }),

  getSession: publicProcedure
    .input(
      z.object({
        code: z.string(),
        /**
         * For the big screen: only the category on it, with what the audience may see (even
         * on a host's laptop, and with sources' reveal options in an aggregate's)
         */
        bigScreen: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [session, access] = await Promise.all([
        ctx.db.session.findUnique({
          where: { code: input.code },
          // Never send the password hash to the client
          omit: { password: true },
          include: {
            categories: {
              where: input.bigScreen ? { isActive: true } : undefined,
              orderBy: runningOrder,
              include: {
                nominations: {
                  orderBy: { createdAt: "asc" },
                  include: scoringFields,
                },
                sourceCategories: { orderBy: runningOrder },
                aggregateOf: {
                  orderBy: runningOrder,
                  select: { id: true, name: true },
                },
              },
            },
          },
        }),
        // Only to check access; never sent to the client
        ctx.db.session.findUnique({
          where: { code: input.code },
          select: { id: true, password: true },
        }),
      ]);

      if (!session || !access) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      const canManage = isHost(ctx, access);
      return {
        ...session,
        categories: await withScores(
          ctx.db,
          session.categories,
          canManage && !input.bigScreen,
        ),
        // So host pages can tell when they've lost access (and only got public scores). The big
        // screen always gets public scores, whoever is looking.
        canManage,
      };
    }),

  addCategory: publicProcedure
    .input(categoryFormSchema)
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(ctx, { sessionId: input.sessionId });
      const sourceIds =
        input.type === "AGGREGATE" ? [...new Set(input.sourceCategories)] : [];
      // One transaction, so an aggregate is created with all its nominations or not at all.
      // It holds the show's lock, so two categories added at once get different places.
      return hostWrite(
        ctx.db,
        input.sessionId,
        { type: "show" },
        "Failed to create category",
        async tx => {
          if (sourceIds.length) {
            await assertValidSources(tx, input.sessionId, sourceIds);
          }

          // A new category goes to the end of the running order
          const last = await tx.category.aggregate({
            where: { sessionId: input.sessionId },
            _max: { position: true },
          });
          const category = await tx.category.create({
            data: {
              sessionId: input.sessionId,
              position: (last._max.position ?? -1) + 1,
              name: input.name,
              description: input.description,
              type: input.type as CategoryType,
              rankingTop: input.type === "RANKING" ? input.rankingTop : null,
              sourceCategories: sourceIds.length
                ? { connect: sourceIds.map(id => ({ id })) }
                : undefined,
            },
          });

          // An aggregate starts with a copy of its sources' nominations
          if (sourceIds.length) {
            await reconcileAggregate(tx, category.id, sourceIds);
          }

          return category;
        },
      );
    }),

  /**
   * Changes a category's name and description, a ranking category's number of places (only before
   * anyone has voted, since it changes everyone's points), or an aggregate's sources. Its type
   * stays as it is.
   */
  updateCategory: publicProcedure
    .input(categoryUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { categoryId: input.id });
      // Holding the show's lock: changing sources rewrites the aggregate's copies, like adding a
      // nomination does, and votes can't arrive between counting them and changing the places
      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to update category",
        async tx => {
          const category = await tx.category.findUnique({
            where: { id: input.id },
            select: {
              type: true,
              rankingTop: true,
              sourceCategories: { select: { id: true } },
            },
          });
          if (!category) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Category not found",
            });
          }

          const rankingTop =
            category.type === "RANKING" ? input.rankingTop : undefined;
          if (rankingTop && rankingTop !== category.rankingTop) {
            const votes = await tx.vote.count({
              where: { nomination: { categoryId: input.id } },
            });
            if (votes > 0) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "People have already voted in this category. Reset its votes to change how many places they rank.",
              });
            }
          }

          // Only when they change: the form sends an aggregate's sources with every edit
          const sourceIds =
            category.type === "AGGREGATE" && input.sourceCategories
              ? [...new Set(input.sourceCategories)]
              : undefined;
          const current = new Set(category.sourceCategories.map(s => s.id));
          const sourcesChanged =
            sourceIds &&
            (sourceIds.length !== current.size ||
              sourceIds.some(id => !current.has(id)));
          if (sourcesChanged) {
            await assertValidSources(tx, session.id, sourceIds);
            await reconcileAggregate(tx, input.id, sourceIds);
          }

          return tx.category.update({
            where: { id: input.id },
            data: {
              name: input.name,
              description: input.description,
              rankingTop,
              sourceCategories: sourcesChanged
                ? { set: sourceIds.map(id => ({ id })) }
                : undefined,
            },
          });
        },
      );
    }),

  /**
   * Moves a category one place up or down in the show's running order, swapping it with its
   * neighbour as the show is now. So a click from an out-of-date page moves it relative to the
   * current order, rather than restoring an old one. At the top (or bottom) it stays where it is.
   */
  moveCategory: publicProcedure
    .input(z.object({ id: z.string(), direction: z.enum(["up", "down"]) }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { categoryId: input.id });
      // Holding the show's lock, so two moves (or a move and an add) don't interleave
      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to move category",
        async tx => {
          const order = await tx.category.findMany({
            where: { sessionId: session.id },
            orderBy: runningOrder,
            select: { id: true, position: true },
          });
          const from = order.findIndex(c => c.id === input.id);
          const to = from + (input.direction === "up" ? -1 : 1);
          if (from === -1) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Category not found",
            });
          }
          if (to >= 0 && to < order.length) {
            [order[from], order[to]] = [order[to]!, order[from]!];
          }
          // Number them 0, 1, 2, … again, which also settles ties from older shows
          await Promise.all(
            order.flatMap((category, index) =>
              category.position === index
                ? []
                : [
                    tx.category.update({
                      where: { id: category.id },
                      data: { position: index },
                    }),
                  ],
            ),
          );
          // The new running order
          return order.map(c => c.id);
        },
      );
    }),

  getCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const found = await ctx.db.category.findUnique({
        where: { id: input.id },
        include: {
          nominations: { include: scoringFields },
          sourceCategories: { orderBy: runningOrder },
          // Only to check access; never sent to the client
          session: { select: { id: true, password: true } },
        },
      });

      if (!found) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      const { session, ...category } = found;
      const [scored] = await withScores(
        ctx.db,
        [category],
        isHost(ctx, session),
      );
      return scored!;
    }),

  addNomination: publicProcedure
    .input(nominationFormSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, {
        categoryId: input.categoryId,
      });
      // One transaction holding the show's lock, so creating an aggregate of this category
      // at the same moment can't copy the nomination twice or miss it (see addCategory)
      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to create nomination",
        async tx => {
          const category = await tx.category.findUnique({
            where: { id: input.categoryId },
            select: { type: true },
          });
          if (!category) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Category not found",
            });
          }
          if (category.type === "AGGREGATE") {
            // Its nominations are copied from its sources
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Add nominations to the source categories instead",
            });
          }

          const description = await assertValidNomination(tx, {
            ...input,
            categoryType: category.type,
          });

          const nomination = await tx.nomination.create({
            data: {
              categoryId: input.categoryId,
              name: input.name,
              description,
            },
          });

          // Copy it to the aggregates that use this category
          await reconcileAggregatesOf(
            tx,
            await aggregatesOf(tx, input.categoryId),
            [input.name],
          );

          return nomination;
        },
      );
    }),

  /**
   * Renames a nomination or changes its description, keeping its votes. Its copies in aggregates
   * follow (see reconcileAggregate); `mergedIn` lists the aggregates where it now counts
   * together with another nomination of the new name.
   */
  updateNomination: publicProcedure
    .input(nominationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { nominationId: input.id });
      // Holding the show's lock, like addNomination, since it changes aggregates' copies
      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to update nomination",
        async tx => {
          const before = await tx.nomination.findUnique({
            where: { id: input.id },
            select: {
              name: true,
              description: true,
              categoryId: true,
              category: { select: { type: true } },
            },
          });
          if (!before) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Nomination not found",
            });
          }
          if (before.category.type === "AGGREGATE") {
            // Its nominations are copies matched to its sources by name
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Edit nominations in the source categories instead",
            });
          }

          // Left out, the description stays as it is
          const description = await assertValidNomination(tx, {
            ...input,
            description: input.description ?? before.description ?? undefined,
            categoryId: before.categoryId,
            categoryType: before.category.type,
            exceptId: input.id,
          });

          const nomination = await tx.nomination.update({
            where: { id: input.id },
            data: {
              name: input.name,
              description,
            },
          });
          const aggregates = await aggregatesOf(tx, before.categoryId);
          // Aggregates where another source nomination already has the new name: the two now
          // count together there, which the host should know
          const sameName =
            before.name === input.name || !aggregates.length
              ? []
              : await tx.nomination.findMany({
                  where: {
                    name: input.name,
                    id: { not: input.id },
                    categoryId: {
                      in: aggregates.flatMap(a =>
                        a.sourceCategories.map(s => s.id),
                      ),
                    },
                  },
                  select: { categoryId: true },
                });
          const mergedIn = aggregates
            .filter(a =>
              a.sourceCategories.some(s =>
                sameName.some(n => n.categoryId === s.id),
              ),
            )
            .map(a => a.name);
          await reconcileAggregatesOf(tx, aggregates, [
            ...new Set([before.name, input.name]),
          ]);
          return { nomination, mergedIn };
        },
      );
    }),

  /**
   * Moves a category to a stage of the show, as the host runs it:
   *
   * - `open`: on the big screen, taking votes (any other category leaves the screen)
   * - `closed`: voting has stopped, ahead of the reveal (on the big screen)
   * - `revealed`: its results are on the big screen (voting stays closed)
   * - `off`: off the big screen, keeping whether it was closed or revealed
   *
   * Each stage sets the whole state (`STAGE_FLAGS`), so repeating a click never flips it the wrong
   * way. With `from`, the stage the host's page showed, a step from an out-of-date page (another
   * device moved the category on meanwhile) is refused rather than moving it back. Holds the
   * show's lock: voting stops (or the results are shown) only once the votes being saved have
   * landed.
   */
  setCategoryStage: publicProcedure
    .input(
      z.object({
        id: z.string(),
        stage: z.enum(SERVER_STAGES),
        from: z.enum(STAGES).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { categoryId: input.id });
      const data = STAGE_FLAGS[input.stage];

      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to update the category",
        async tx => {
          const category = await tx.category.findUnique({
            where: { id: input.id },
            select: {
              type: true,
              isActive: true,
              votingClosed: true,
              revealed: true,
            },
          });
          // Deleted after the access check
          if (!category) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Category not found",
            });
          }
          if (category.type === "AGGREGATE" && input.stage === "open") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "An aggregate category takes no votes. Reveal it instead.",
            });
          }
          if (input.from && stageOf(category) !== input.from) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "This category has moved on since your page last updated. Check where it is, then try again.",
            });
          }
          // At most one category is on the big screen. Pages show the step straight away the
          // same way (applyStage in stages.ts).
          if (data.isActive) {
            await tx.category.updateMany({
              where: {
                sessionId: session.id,
                isActive: true,
                id: { not: input.id },
              },
              data: { isActive: false },
            });
          }
          await tx.category.update({ where: { id: input.id }, data });
          return { id: input.id, stage: input.stage };
        },
      );
    }),

  /** How a category's reveal shows it: set to the values given, at the reveal step */
  setRevealOptions: publicProcedure
    .input(
      z.object({
        id: z.string(),
        hideVoteCounts: z.boolean().optional(),
        winnerOnly: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { categoryId: input.id });
      const { id, ...options } = input;
      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to update the category",
        async tx => {
          const { count } = await tx.category.updateMany({
            where: { id },
            data: options,
          });
          // Deleted after the access check
          if (!count) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Category not found",
            });
          }
          return { id, ...options };
        },
      );
    }),

  vote: publicProcedure
    .input(
      z.object({
        nominationId: z.string().min(1, "Nomination ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const deviceId = getCookie(ctx.headers, DEVICE_ID_COOKIE);

        if (!deviceId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No device ID found - please enable cookies",
          });
        }

        const nomination = await ctx.db.nomination.findUnique({
          where: { id: input.nominationId },
          select: {
            categoryId: true,
            category: {
              select: {
                type: true,
                isActive: true,
                votingClosed: true,
                revealed: true,
                sessionId: true,
              },
            },
          },
        });

        if (!nomination) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Nomination not found",
          });
        }

        if (nomination.category.type === "AGGREGATE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot vote in aggregate categories",
          });
        }

        if (nomination.category.type === "RANKING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Use submitRanking for ranking categories",
          });
        }

        // Fail fast; saveVote checks again while holding the locks
        assertVotingOpen(nomination.category);

        return await saveVote(
          ctx.db,
          {
            deviceId,
            sessionId: nomination.category.sessionId,
            categoryId: nomination.categoryId,
            nominationIds: [input.nominationId],
          },
          tx =>
            tx.vote.create({
              data: { deviceId, nominationId: input.nominationId },
            }),
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cast vote",
        });
      }
    }),

  submitRanking: publicProcedure
    .input(rankingSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const deviceId = getCookie(ctx.headers, DEVICE_ID_COOKIE);

        if (!deviceId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No device ID found - please enable cookies",
          });
        }

        // Get the category and validate it's a ranking category
        const category = await ctx.db.category.findUnique({
          where: { id: input.categoryId },
          select: {
            type: true,
            rankingTop: true,
            isActive: true,
            votingClosed: true,
            revealed: true,
            sessionId: true,
            nominations: { select: { id: true } },
          },
        });

        if (!category) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }

        if (category.type !== "RANKING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This is not a ranking category",
          });
        }

        // Fail fast, before validating a stale form; saveVote checks again
        // while holding the locks
        assertVotingOpen(category);

        if (!category.rankingTop) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Ranking category is missing rankingTop configuration",
          });
        }

        // Validate the correct number of rankings
        if (input.rankings.length !== category.rankingTop) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You must rank exactly ${category.rankingTop} nominations`,
          });
        }

        // Validate all nominations belong to this category
        const nominationIds = new Set(category.nominations.map(n => n.id));
        for (const ranking of input.rankings) {
          if (!nominationIds.has(ranking.nominationId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid nomination in ranking",
            });
          }
        }

        // Validate unique ranks (1 to rankingTop)
        const ranks = input.rankings.map(r => r.rank);
        const expectedRanks = Array.from(
          { length: category.rankingTop },
          (_, i) => i + 1,
        );
        const sortedRanks = [...ranks].sort((a, b) => a - b);
        if (JSON.stringify(sortedRanks) !== JSON.stringify(expectedRanks)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Ranks must be unique values from 1 to ${category.rankingTop}`,
          });
        }

        // Validate no duplicate nominations
        const uniqueNominations = new Set(
          input.rankings.map(r => r.nominationId),
        );
        if (uniqueNominations.size !== input.rankings.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot rank the same nomination multiple times",
          });
        }

        return await saveVote(
          ctx.db,
          {
            deviceId,
            sessionId: category.sessionId,
            categoryId: input.categoryId,
            nominationIds: input.rankings.map(r => r.nominationId),
            rankingTop: category.rankingTop,
          },
          tx =>
            tx.vote.createManyAndReturn({
              data: input.rankings.map(ranking => ({
                deviceId,
                nominationId: ranking.nominationId,
                rank: ranking.rank,
              })),
            }),
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit ranking",
        });
      }
    }),

  /**
   * This device's votes in a category: at most one in a normal or image
   * category, the whole ranking (best first) in a ranking category.
   */
  getMyVotes: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deviceId = getCookie(ctx.headers, DEVICE_ID_COOKIE);

      if (!deviceId) {
        return [];
      }

      return ctx.db.vote.findMany({
        where: {
          deviceId,
          nomination: {
            categoryId: input.categoryId,
          },
        },
        select: { nominationId: true, rank: true },
        orderBy: { rank: "asc" },
      });
    }),

  deleteNomination: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { nominationId: input.id });
      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to delete nomination",
        async tx => {
          // Votes are removed by the onDelete: Cascade relation
          const nomination = await tx.nomination.delete({
            where: { id: input.id },
          });
          // Its aggregates drop their copy unless another source has the name
          await reconcileAggregatesOf(
            tx,
            await aggregatesOf(tx, nomination.categoryId),
            [nomination.name],
          );
          return nomination;
        },
      );
    }),

  deleteCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { categoryId: input.id });
      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to delete category",
        async tx => {
          const [aggregates, nominations] = await Promise.all([
            aggregatesOf(tx, input.id),
            tx.nomination.findMany({
              where: { categoryId: input.id },
              select: { name: true },
            }),
          ]);
          // Nominations and votes are removed by the onDelete: Cascade relations
          const category = await tx.category.delete({
            where: { id: input.id },
          });
          // Its aggregates drop the copies only it had
          await reconcileAggregatesOf(
            tx,
            aggregates.map(a => ({
              ...a,
              sourceCategories: a.sourceCategories.filter(
                s => s.id !== input.id,
              ),
            })),
            [...new Set(nominations.map(n => n.name))],
          );
          return category;
        },
      );
    }),

  deleteSession: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(ctx, { sessionId: input.id });
      return hostWrite(
        ctx.db,
        input.id,
        { type: "show" },
        "Failed to delete session",
        async tx => {
          // Categories, nominations and votes are removed by the onDelete: Cascade relations
          await tx.session.delete({ where: { id: input.id } });
          return { success: true };
        },
      );
    }),

  resetCategoryVotes: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, {
        categoryId: input.categoryId,
      });
      return hostWrite(
        ctx.db,
        session.id,
        { type: "show" },
        "Failed to reset category votes",
        tx =>
          tx.vote.deleteMany({
            where: { nomination: { categoryId: input.categoryId } },
          }),
      );
    }),

  resetAllVotes: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(ctx, { sessionId: input.sessionId });
      return hostWrite(
        ctx.db,
        input.sessionId,
        { type: "show" },
        "Failed to reset all votes",
        tx =>
          tx.vote.deleteMany({
            where: { nomination: { category: { sessionId: input.sessionId } } },
          }),
      );
    }),

  getPublicSessions: publicProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.db.session.findMany({
        select: {
          code: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch public sessions",
        cause: error,
      });
    }
  }),

  verifyManageAccess: publicProcedure
    .input(
      z.object({
        code: z.string(),
        // Shows created before BAR-49 allowed up to 100 characters; this only stops huge inputs
        password: z.string().max(1000, "Invalid password"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { code: input.code },
        select: { id: true, password: true },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // If no password is set, allow access
      if (!session.password) {
        return { success: true };
      }

      // Counted before the check, so parallel guesses can't get past the limit
      await countLoginAttempt(ctx.db, session.id, loginClient(ctx.headers));

      // Passwords are stored normalized and without surrounding spaces, so a stray space from a
      // phone keyboard doesn't matter. Shows created before that are also checked as typed.
      let isValid = false;
      for (const candidate of new Set([
        normalizePassword(input.password).trim(),
        input.password,
      ])) {
        if (await bcrypt.compare(candidate, session.password)) {
          isValid = true;
          break;
        }
      }
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      await clearLoginAttempts(ctx.db, session.id);
      setManageCookie(ctx.resHeaders, session.id);
      return { success: true };
    }),
});
