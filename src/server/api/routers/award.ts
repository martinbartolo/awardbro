import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { type CategoryType, Prisma } from "~/generated/prisma/client";
import {
  categoryFormSchema,
  nominationFormSchema,
  normalizePassword,
  rankingSubmissionSchema,
  sessionFormSchema,
} from "~/lib/schemas";
import { scoreNomination } from "~/lib/scoring";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { assertCanManage } from "~/server/auth/manage";
import { setManageCookie } from "~/server/auth/manage-token";
import { DEVICE_ID_COOKIE, getCookie } from "~/server/cookies";
import { type db } from "~/server/db";

/**
 * What to load with each nomination to score it: its vote count, and the ranks of its ranked
 * votes. Votes in other categories have no rank, so they aren't loaded.
 */
const scoringFields = {
  _count: { select: { votes: true } },
  votes: { where: { rank: { not: null } }, select: { rank: true } },
} as const;

/**
 * A category's nominations with their scores in `_count.votes` (votes, or points in ranking and
 * aggregate categories), and without their votes, so individual votes are never sent.
 */
const withScores = async <
  N extends {
    name: string;
    _count: { votes: number };
    votes: { rank: number | null }[];
  },
>(
  client: typeof db,
  category: {
    type: CategoryType;
    rankingTop: number | null;
    sourceCategories: { id: string }[];
    nominations: N[];
  },
) => {
  const sourceNominations =
    category.type === "AGGREGATE"
      ? await client.nomination.findMany({
          where: {
            name: { in: category.nominations.map(n => n.name) },
            categoryId: { in: category.sourceCategories.map(c => c.id) },
          },
          select: {
            name: true,
            ...scoringFields,
            category: { select: { type: true, rankingTop: true } },
          },
        })
      : [];

  return category.nominations.map(({ votes, ...nomination }) => ({
    ...nomination,
    _count: {
      votes: scoreNomination(
        category,
        { ...nomination, votes },
        sourceNominations,
      ),
    },
  }));
};

const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

// Store failed attempts in memory (in production, use Redis or similar)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

const checkRateLimit = (identifier: string) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (attempts) {
    // Reset if lockout time has passed
    if (now - attempts.lastAttempt > LOCKOUT_TIME) {
      loginAttempts.delete(identifier);
      return;
    }

    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const timeLeft = Math.ceil(
        (LOCKOUT_TIME - (now - attempts.lastAttempt)) / 1000 / 60,
      );
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many attempts. Please try again in ${timeLeft} minutes`,
      });
    }
  }
};

const recordLoginAttempt = (identifier: string, success: boolean) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (success) {
    loginAttempts.delete(identifier);
    return;
  }

  if (attempts) {
    loginAttempts.set(identifier, {
      count: attempts.count + 1,
      lastAttempt: now,
    });
  } else {
    loginAttempts.set(identifier, {
      count: 1,
      lastAttempt: now,
    });
  }
};

/*
 * Each show has an advisory lock that keeps votes and host actions apart.
 * Saving a vote takes it shared, so voters don't block each other. Host
 * actions that change what can be voted on or delete votes (switching or
 * stopping a category, resets, deletes) take it exclusively: they wait for
 * votes already being saved, and votes arriving meanwhile wait for them.
 * Postgres queues these locks fairly, so a stream of votes can't starve the
 * host. The key is a bigint, which keeps it apart from the two-int device lock.
 */

/** Takes the show's lock exclusively. Put it first in a batch transaction. */
const lockShow = (client: Prisma.TransactionClient, sessionId: string) =>
  client.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${sessionId}, 0))`;

/** No connection or lock in time (P2028), or a transaction conflict (P2034) */
const isBusy = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2028" || error.code === "P2034");

const hostBusy = () =>
  new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Couldn't save that change just now. Please try again.",
  });

/** Runs one host write in a transaction holding the show's lock exclusively. */
const withShowLocked = async <T>(
  client: typeof db,
  sessionId: string,
  query: Prisma.PrismaPromise<T>,
): Promise<T> => {
  try {
    const [, result] = await client.$transaction([
      lockShow(client, sessionId),
      query,
    ]);
    return result;
  } catch (error) {
    if (isBusy(error)) throw hostBusy();
    throw error;
  }
};

const VOTE_NOT_ACTIVE = "Voting is not currently active for this category";

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
  },
  write: (tx: Prisma.TransactionClient) => Promise<T>,
) => {
  const { deviceId, sessionId, categoryId, nominationIds } = target;
  try {
    return await client.$transaction(
      async tx => {
        // Show lock first, then the device lock, always in this order
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock_shared(hashtextextended(${sessionId}, 0))`;
        const [category] = await tx.$queryRaw<{ isActive: boolean }[]>`
          SELECT c."isActive"
          FROM pg_advisory_xact_lock(hashtext(${deviceId}), hashtext(${categoryId})),
            "Category" c
          WHERE c."id" = ${categoryId}`;
        if (!category?.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: VOTE_NOT_ACTIVE,
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
      try {
        const session = await ctx.db.session.create({
          data: {
            name: input.name,
            slug: input.slug,
            password: input.password
              ? await bcrypt.hash(
                  normalizePassword(input.password),
                  SALT_ROUNDS,
                )
              : null,
          },
          select: { id: true, name: true, slug: true },
        });
        // The creator can manage the show straight away without re-entering the password
        setManageCookie(ctx.resHeaders, session.id);
        return session;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "That URL is already in use. Please try another one",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create session",
        });
      }
    }),

  getSessionBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        activeOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { slug: input.slug },
        // Never send the password hash to the client
        omit: { password: true },
        include: {
          categories: {
            where: input.activeOnly ? { isActive: true } : undefined,
            orderBy: { createdAt: "asc" },
            include: {
              nominations: {
                orderBy: { createdAt: "asc" },
                include: scoringFields,
              },
              sourceCategories: true,
              aggregateOf: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      return {
        ...session,
        categories: await Promise.all(
          session.categories.map(async category => ({
            ...category,
            nominations: await withScores(ctx.db, category),
          })),
        ),
      };
    }),

  getSessionCategories: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.category.findMany({
        where: {
          sessionId: input.sessionId,
          type: { not: "AGGREGATE" }, // Only return non-aggregate categories as sources
        },
        select: {
          id: true,
          name: true,
        },
      });
    }),

  addCategory: publicProcedure
    .input(categoryFormSchema)
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(ctx, { sessionId: input.sessionId });
      const sourceIds =
        input.type === "AGGREGATE" ? [...new Set(input.sourceCategories)] : [];
      try {
        // One transaction, so an aggregate is created with all its nominations or not at all
        return await ctx.db.$transaction(
          async tx => {
            if (sourceIds.length) {
              // The show's lock keeps a source from being deleted between the check and the link
              await lockShow(tx, input.sessionId);
              const validSources = await tx.category.count({
                where: {
                  id: { in: sourceIds },
                  sessionId: input.sessionId,
                  type: { not: "AGGREGATE" },
                },
              });
              if (validSources !== sourceIds.length) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message:
                    "Source categories must be non-aggregate categories in this show",
                });
              }
            }

            const category = await tx.category.create({
              data: {
                sessionId: input.sessionId,
                name: input.name,
                description: input.description,
                type: input.type as CategoryType,
                rankingTop: input.type === "RANKING" ? input.rankingTop : null,
                hideVoteCounts: input.hideVoteCounts ?? false,
                winnerOnly: input.winnerOnly ?? false,
                sourceCategories: sourceIds.length
                  ? { connect: sourceIds.map(id => ({ id })) }
                  : undefined,
              },
            });

            // An aggregate starts with a copy of its sources' nominations, one per name
            if (sourceIds.length) {
              const sourceNominations = await tx.nomination.findMany({
                where: { categoryId: { in: sourceIds } },
                distinct: ["name"],
                select: { name: true, description: true },
              });
              await tx.nomination.createMany({
                data: sourceNominations.map(nom => ({
                  name: nom.name,
                  description: nom.description,
                  categoryId: category.id,
                })),
              });
            }

            return category;
          },
          { maxWait: 5000, timeout: 10000 },
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (isBusy(error)) throw hostBusy();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create category",
        });
      }
    }),

  getCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.category.findUnique({
        where: { id: input.id },
        include: {
          nominations: { include: scoringFields },
          sourceCategories: true,
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return {
        ...category,
        nominations: await withScores(ctx.db, category),
      };
    }),

  toggleRevealCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { categoryId: input.id });
      const category = await ctx.db.category.findUnique({
        where: { id: input.id },
        select: { revealed: true },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // Holding the show's lock, so the results don't change after the reveal
      // as votes being saved land
      return withShowLocked(
        ctx.db,
        session.id,
        ctx.db.category.update({
          where: { id: input.id },
          data: { revealed: !category.revealed },
        }),
      );
    }),

  toggleHideVoteCounts: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(ctx, { categoryId: input.categoryId });
      const category = await ctx.db.category.findUnique({
        where: { id: input.categoryId },
        select: { hideVoteCounts: true },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return ctx.db.category.update({
        where: { id: input.categoryId },
        data: { hideVoteCounts: !category.hideVoteCounts },
      });
    }),

  toggleWinnerOnly: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(ctx, { categoryId: input.categoryId });
      const category = await ctx.db.category.findUnique({
        where: { id: input.categoryId },
        select: { winnerOnly: true },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return ctx.db.category.update({
        where: { id: input.categoryId },
        data: { winnerOnly: !category.winnerOnly },
      });
    }),

  addNomination: publicProcedure
    .input(nominationFormSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, {
        categoryId: input.categoryId,
      });
      try {
        // One transaction holding the show's lock, so creating an aggregate of this category
        // at the same moment can't copy the nomination twice or miss it (see addCategory)
        return await ctx.db.$transaction(
          async tx => {
            await lockShow(tx, session.id);
            const category = await tx.category.findUnique({
              where: { id: input.categoryId },
              include: { aggregateOf: { select: { id: true } } },
            });
            if (!category) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Category not found",
              });
            }

            const nomination = await tx.nomination.create({
              data: {
                categoryId: input.categoryId,
                name: input.name,
                description: input.description,
              },
            });

            // Copy it to the aggregates that use this category, unless one already has that name
            const aggregateIds = category.aggregateOf.map(a => a.id);
            if (aggregateIds.length) {
              const haveName = await tx.nomination.findMany({
                where: { categoryId: { in: aggregateIds }, name: input.name },
                select: { categoryId: true },
              });
              const skip = new Set(haveName.map(n => n.categoryId));
              await tx.nomination.createMany({
                data: aggregateIds
                  .filter(id => !skip.has(id))
                  .map(categoryId => ({
                    categoryId,
                    name: input.name,
                    description: input.description,
                  })),
              });
            }

            return nomination;
          },
          { maxWait: 5000, timeout: 10000 },
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (isBusy(error)) throw hostBusy();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create nomination",
        });
      }
    }),

  // Sets the category to the state the host asked for, so repeating a click
  // (or clicking on an out-of-date page) never flips it the other way
  setActiveCategory: publicProcedure
    .input(z.object({ categoryId: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, {
        categoryId: input.categoryId,
      });

      try {
        if (!input.active) {
          return await withShowLocked(
            ctx.db,
            session.id,
            ctx.db.category.update({
              where: { id: input.categoryId },
              data: { isActive: false },
            }),
          );
        }

        // Deactivate all categories in the show and activate this one, holding
        // the show's lock, so at most one category is ever active and votes
        // being saved finish first
        const [, , activated] = await ctx.db.$transaction([
          lockShow(ctx.db, session.id),
          ctx.db.category.updateMany({
            where: { sessionId: session.id },
            data: { isActive: false },
          }),
          ctx.db.category.update({
            where: { id: input.categoryId },
            data: { isActive: true },
          }),
        ]);
        return activated;
      } catch (error) {
        // The category was deleted after the access check
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }
        if (isBusy(error)) throw hostBusy();
        throw error;
      }
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
              select: { type: true, isActive: true, sessionId: true },
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
        if (!nomination.category.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: VOTE_NOT_ACTIVE,
          });
        }

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
        if (!category.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: VOTE_NOT_ACTIVE,
          });
        }

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
      try {
        // Votes are removed by the onDelete: Cascade relation
        return await withShowLocked(
          ctx.db,
          session.id,
          ctx.db.nomination.delete({ where: { id: input.id } }),
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete nomination",
        });
      }
    }),

  deleteCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, { categoryId: input.id });
      try {
        // Nominations and votes are removed by the onDelete: Cascade relations
        return await withShowLocked(
          ctx.db,
          session.id,
          ctx.db.category.delete({ where: { id: input.id } }),
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete category",
        });
      }
    }),

  deleteSession: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(ctx, { sessionId: input.id });
      try {
        // Categories, nominations and votes are removed by the onDelete: Cascade relations
        await withShowLocked(
          ctx.db,
          input.id,
          ctx.db.session.delete({ where: { id: input.id } }),
        );
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete session",
        });
      }
    }),

  resetCategoryVotes: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertCanManage(ctx, {
        categoryId: input.categoryId,
      });
      try {
        return await withShowLocked(
          ctx.db,
          session.id,
          ctx.db.vote.deleteMany({
            where: { nomination: { categoryId: input.categoryId } },
          }),
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset category votes",
        });
      }
    }),

  resetAllVotes: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(ctx, { sessionId: input.sessionId });
      try {
        return await withShowLocked(
          ctx.db,
          input.sessionId,
          ctx.db.vote.deleteMany({
            where: { nomination: { category: { sessionId: input.sessionId } } },
          }),
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset all votes",
        });
      }
    }),

  getPublicSessions: publicProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.db.session.findMany({
        select: {
          slug: true,
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
        slug: z.string(),
        // Shows created before BAR-49 allowed up to 100 characters; this only stops huge inputs
        password: z.string().max(1000, "Invalid password"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check rate limit before proceeding
      checkRateLimit(input.slug);

      const session = await ctx.db.session.findUnique({
        where: { slug: input.slug },
        select: { id: true, password: true },
      });

      if (!session) {
        recordLoginAttempt(input.slug, false);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // If no password is set, allow access
      if (!session.password) {
        recordLoginAttempt(input.slug, true);
        return { success: true };
      }

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
      recordLoginAttempt(input.slug, isValid);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      setManageCookie(ctx.resHeaders, session.id);
      return { success: true };
    }),
});
