import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { type CategoryType, Prisma } from "~/generated/prisma/client";
import {
  categoryFormSchema,
  nominationFormSchema,
  rankingSubmissionSchema,
  sessionFormSchema,
} from "~/lib/schemas";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Helper function to calculate points for a ranking vote
const calculatePoints = (rank: number, rankingTop: number): number => {
  return rankingTop - rank + 1;
};

const DEVICE_ID_COOKIE = "device_id";
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

export const awardRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(sessionFormSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.session.create({
          data: {
            name: input.name,
            slug: input.slug,
            password: input.password
              ? await bcrypt.hash(input.password, SALT_ROUNDS)
              : null,
          },
        });
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

  getSession: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { id: input.id },
        include: {
          categories: {
            include: {
              nominations: {
                include: {
                  _count: {
                    select: { votes: true },
                  },
                },
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

      return session;
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
        include: {
          categories: {
            where: input.activeOnly ? { isActive: true } : undefined,
            orderBy: { createdAt: "asc" },
            include: {
              nominations: {
                orderBy: { createdAt: "asc" },
                include: {
                  _count: {
                    select: { votes: true },
                  },
                },
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

      // Process categories that need vote/point calculation
      const categoriesWithCalculatedVotes = await Promise.all(
        session.categories.map(async category => {
          // For RANKING categories, calculate points instead of simple vote count
          if (category.type === "RANKING" && category.rankingTop) {
            const nominationsWithPoints = await Promise.all(
              category.nominations.map(async nomination => {
                const votes = await ctx.db.vote.findMany({
                  where: { nominationId: nomination.id },
                });

                // Sum up points for each vote based on rank
                const totalPoints = votes.reduce((sum, vote) => {
                  if (vote.rank) {
                    return (
                      sum + calculatePoints(vote.rank, category.rankingTop!)
                    );
                  }
                  return sum;
                }, 0);

                return {
                  ...nomination,
                  _count: {
                    votes: totalPoints,
                  },
                };
              }),
            );

            return {
              ...category,
              nominations: nominationsWithPoints,
            };
          }

          // For AGGREGATE categories, sum up votes/points from source categories
          if (category.type === "AGGREGATE") {
            const nominationsWithTotalVotes = await Promise.all(
              category.nominations.map(async nomination => {
                // Find matching nominations in source categories
                const sourceNominations = await ctx.db.nomination.findMany({
                  where: {
                    name: nomination.name,
                    categoryId: {
                      in: category.sourceCategories.map(c => c.id),
                    },
                  },
                  include: {
                    votes: true,
                    category: {
                      select: {
                        type: true,
                        rankingTop: true,
                      },
                    },
                  },
                });

                // Sum up all points for this nomination across source categories
                let totalPoints = 0;
                for (const nom of sourceNominations) {
                  if (
                    nom.category.type === "RANKING" &&
                    nom.category.rankingTop
                  ) {
                    // Calculate points for ranking categories
                    for (const vote of nom.votes) {
                      if (vote.rank) {
                        totalPoints += calculatePoints(
                          vote.rank,
                          nom.category.rankingTop,
                        );
                      }
                    }
                  } else {
                    // For normal/image categories, each vote = 1 point
                    totalPoints += nom.votes.length;
                  }
                }

                return {
                  ...nomination,
                  _count: {
                    votes: totalPoints,
                  },
                };
              }),
            );

            return {
              ...category,
              nominations: nominationsWithTotalVotes,
            };
          }

          return category;
        }),
      );

      return {
        ...session,
        categories: categoriesWithCalculatedVotes,
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
      try {
        const category = await ctx.db.category.create({
          data: {
            sessionId: input.sessionId,
            name: input.name,
            description: input.description,
            type: input.type as CategoryType,
            rankingTop: input.type === "RANKING" ? input.rankingTop : null,
            hideVoteCounts: input.hideVoteCounts ?? false,
            winnerOnly: input.winnerOnly ?? false,
            sourceCategories:
              input.type === "AGGREGATE"
                ? {
                    connect: input.sourceCategories.map(id => ({ id })),
                  }
                : undefined,
          },
        });

        // If this is an aggregate category, copy nominations from source categories
        if (input.type === "AGGREGATE" && input.sourceCategories.length) {
          const sourceNominations = await ctx.db.nomination.findMany({
            where: {
              categoryId: {
                in: input.sourceCategories,
              },
            },
            distinct: ["name"],
            select: {
              name: true,
              description: true,
            },
          });

          // Create nominations in the aggregate category
          await ctx.db.nomination.createMany({
            data: sourceNominations.map(nom => ({
              name: nom.name,
              description: nom.description,
              categoryId: category.id,
            })),
          });
        }

        return category;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
          nominations: {
            include: {
              _count: {
                select: { votes: true },
              },
              votes: true,
            },
          },
          sourceCategories: true,
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // For RANKING categories, calculate points instead of vote count
      if (category.type === "RANKING" && category.rankingTop) {
        const nominationsWithPoints = category.nominations.map(nomination => {
          const totalPoints = nomination.votes.reduce((sum, vote) => {
            if (vote.rank) {
              return sum + calculatePoints(vote.rank, category.rankingTop!);
            }
            return sum;
          }, 0);

          return {
            ...nomination,
            votes: undefined, // Don't expose individual votes
            _count: {
              votes: totalPoints,
            },
          };
        });

        return {
          ...category,
          nominations: nominationsWithPoints,
        };
      }

      // If this is an aggregate category, sum up votes/points from source categories
      if (category.type === "AGGREGATE") {
        const nominationsWithTotalVotes = await Promise.all(
          category.nominations.map(async nomination => {
            // Find matching nominations in source categories
            const sourceNominations = await ctx.db.nomination.findMany({
              where: {
                name: nomination.name,
                categoryId: {
                  in: category.sourceCategories.map(c => c.id),
                },
              },
              include: {
                votes: true,
                category: {
                  select: {
                    type: true,
                    rankingTop: true,
                  },
                },
              },
            });

            // Sum up all points for this nomination across source categories
            let totalPoints = 0;
            for (const nom of sourceNominations) {
              if (nom.category.type === "RANKING" && nom.category.rankingTop) {
                for (const vote of nom.votes) {
                  if (vote.rank) {
                    totalPoints += calculatePoints(
                      vote.rank,
                      nom.category.rankingTop,
                    );
                  }
                }
              } else {
                totalPoints += nom.votes.length;
              }
            }

            return {
              ...nomination,
              votes: undefined,
              _count: {
                votes: totalPoints,
              },
            };
          }),
        );

        return {
          ...category,
          nominations: nominationsWithTotalVotes,
        };
      }

      // For normal categories, strip votes from response
      return {
        ...category,
        nominations: category.nominations.map(n => ({
          ...n,
          votes: undefined,
        })),
      };
    }),

  toggleRevealCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      return ctx.db.category.update({
        where: { id: input.id },
        data: { revealed: !category.revealed },
      });
    }),

  toggleHideVoteCounts: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
      try {
        // First verify the category exists and check if it's a source for any aggregate categories
        const category = await ctx.db.category.findUnique({
          where: { id: input.categoryId },
          include: {
            aggregateOf: true, // Get aggregate categories that use this as a source
          },
        });

        if (!category) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }

        const nomination = await ctx.db.nomination.create({
          data: {
            categoryId: input.categoryId,
            name: input.name,
            description: input.description,
          },
        });

        // Sync nomination to any aggregate categories that use this category as a source
        if (category.aggregateOf.length > 0) {
          for (const aggregateCategory of category.aggregateOf) {
            // Check if nomination with this name already exists in the aggregate
            const existingNomination = await ctx.db.nomination.findFirst({
              where: {
                categoryId: aggregateCategory.id,
                name: input.name,
              },
            });

            // Only create if it doesn't exist
            if (!existingNomination) {
              await ctx.db.nomination.create({
                data: {
                  categoryId: aggregateCategory.id,
                  name: input.name,
                  description: input.description,
                },
              });
            }
          }
        }

        return nomination;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create nomination",
        });
      }
    }),

  setActiveCategory: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First, get the current category and its active state
      const category = await ctx.db.category.findUnique({
        where: { id: input.categoryId },
        include: { session: { include: { categories: true } } },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // If the category is currently active, just deactivate it
      if (category.isActive) {
        return ctx.db.category.update({
          where: { id: input.categoryId },
          data: { isActive: false },
        });
      }

      // Otherwise, deactivate all categories in the session and activate this one
      await ctx.db.category.updateMany({
        where: { sessionId: category.session.id },
        data: { isActive: false },
      });

      return ctx.db.category.update({
        where: { id: input.categoryId },
        data: { isActive: true },
      });
    }),

  vote: publicProcedure
    .input(
      z.object({
        nominationId: z.string().min(1, "Nomination ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const deviceId = ctx.headers
          .get("cookie")
          ?.split(";")
          .find(c => c.trim().startsWith(DEVICE_ID_COOKIE + "="))
          ?.split("=")[1];

        if (!deviceId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No device ID found - please enable cookies",
          });
        }

        const nomination = await ctx.db.nomination.findUnique({
          where: { id: input.nominationId },
          include: {
            category: true,
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

        if (!nomination.category.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Voting is not currently active for this category",
          });
        }

        // Handle regular category voting
        const existingVote = await ctx.db.vote.findFirst({
          where: {
            deviceId: deviceId,
            nomination: {
              categoryId: nomination.categoryId,
            },
          },
        });

        if (existingVote) {
          await ctx.db.vote.delete({
            where: { id: existingVote.id },
          });
        }

        return await ctx.db.vote.create({
          data: {
            deviceId,
            nominationId: input.nominationId,
          },
        });
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
        const deviceId = ctx.headers
          .get("cookie")
          ?.split(";")
          .find(c => c.trim().startsWith(DEVICE_ID_COOKIE + "="))
          ?.split("=")[1];

        if (!deviceId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No device ID found - please enable cookies",
          });
        }

        // Get the category and validate it's a ranking category
        const category = await ctx.db.category.findUnique({
          where: { id: input.categoryId },
          include: {
            nominations: true,
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

        if (!category.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Voting is not currently active for this category",
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

        // Delete existing rankings for this device/category
        await ctx.db.vote.deleteMany({
          where: {
            deviceId: deviceId,
            nomination: {
              categoryId: input.categoryId,
            },
          },
        });

        // Create new ranking votes
        const votes = await ctx.db.vote.createManyAndReturn({
          data: input.rankings.map(ranking => ({
            deviceId,
            nominationId: ranking.nominationId,
            rank: ranking.rank,
          })),
        });

        return votes;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit ranking",
        });
      }
    }),

  getCurrentRankings: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deviceId = ctx.headers
        .get("cookie")
        ?.split(";")
        .find(c => c.trim().startsWith(DEVICE_ID_COOKIE + "="))
        ?.split("=")[1];

      if (!deviceId) {
        return [];
      }

      const votes = await ctx.db.vote.findMany({
        where: {
          deviceId: deviceId,
          nomination: {
            categoryId: input.categoryId,
          },
        },
        include: {
          nomination: true,
        },
        orderBy: {
          rank: "asc",
        },
      });

      return votes;
    }),

  getCurrentVote: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deviceId = ctx.headers
        .get("cookie")
        ?.split(";")
        .find(c => c.trim().startsWith(DEVICE_ID_COOKIE + "="))
        ?.split("=")[1];

      if (!deviceId) {
        return null;
      }

      const vote = await ctx.db.vote.findFirst({
        where: {
          deviceId: deviceId,
          nomination: {
            categoryId: input.categoryId,
          },
        },
        include: {
          nomination: true,
        },
      });

      return vote;
    }),

  hasVoted: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deviceId = ctx.headers
        .get("cookie")
        ?.split(";")
        .find(c => c.trim().startsWith(DEVICE_ID_COOKIE + "="))
        ?.split("=")[1];

      if (!deviceId) {
        return false;
      }

      const vote = await ctx.db.vote.findFirst({
        where: {
          deviceId: deviceId,
          nomination: {
            categoryId: input.categoryId,
          },
        },
      });

      return !!vote;
    }),

  deleteNomination: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.vote.deleteMany({
          where: { nominationId: input.id },
        });
        return await ctx.db.nomination.delete({
          where: { id: input.id },
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete nomination",
        });
      }
    }),

  deleteCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Delete all votes for nominations in this category
        await ctx.db.vote.deleteMany({
          where: {
            nomination: {
              categoryId: input.id,
            },
          },
        });
        // Delete all nominations in this category
        await ctx.db.nomination.deleteMany({
          where: { categoryId: input.id },
        });
        // Delete the category
        return await ctx.db.category.delete({
          where: { id: input.id },
        });
      } catch {
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
      try {
        // Delete all votes
        await ctx.db.vote.deleteMany({
          where: {
            nomination: {
              category: {
                sessionId: input.id,
              },
            },
          },
        });
        // Delete all nominations
        await ctx.db.nomination.deleteMany({
          where: {
            category: {
              sessionId: input.id,
            },
          },
        });
        // Delete all categories
        await ctx.db.category.deleteMany({
          where: { sessionId: input.id },
        });
        // Delete the session
        return await ctx.db.session.delete({
          where: { id: input.id },
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete session",
        });
      }
    }),

  resetCategoryVotes: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.vote.deleteMany({
          where: {
            nomination: {
              categoryId: input.categoryId,
            },
          },
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset category votes",
        });
      }
    }),

  resetAllVotes: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.vote.deleteMany({
          where: {
            nomination: {
              category: {
                sessionId: input.sessionId,
              },
            },
          },
        });
      } catch {
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
        password: z.string(),
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

      const isValid = await bcrypt.compare(input.password, session.password);
      recordLoginAttempt(input.slug, isValid);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      return { success: true };
    }),
});
