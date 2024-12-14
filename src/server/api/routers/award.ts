import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

const DEVICE_ID_COOKIE = "device_id";

// Input validation schemas
const sessionInput = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

const categoryInput = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

const nominationInput = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

export const awardRouter = createTRPCRouter({
  createSession: publicProcedure.input(sessionInput).mutation(async ({ ctx, input }) => {
    try {
      return await ctx.db.session.create({
        data: {
          name: input.name,
          slug: input.slug,
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

  getSession: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
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
      })
    )
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { slug: input.slug },
        include: {
          categories: {
            where: input.activeOnly ? { isActive: true } : undefined,
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

  addCategory: publicProcedure.input(categoryInput).mutation(async ({ ctx, input }) => {
    try {
      // First verify the session exists
      const session = await ctx.db.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      return await ctx.db.category.create({
        data: {
          sessionId: input.sessionId,
          name: input.name,
          description: input.description,
        },
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create category",
      });
    }
  }),

  getCategory: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.category.findUnique({
      where: { id: input.id },
      include: {
        nominations: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
      },
    });
  }),

  revealCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.category.update({
        where: { id: input.id },
        data: { revealed: true },
      });
    }),

  addNomination: publicProcedure.input(nominationInput).mutation(async ({ ctx, input }) => {
    try {
      // First verify the category exists
      const category = await ctx.db.category.findUnique({
        where: { id: input.categoryId },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return await ctx.db.nomination.create({
        data: {
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
        },
      });
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
      // First, deactivate all categories in the session
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

      await ctx.db.category.updateMany({
        where: { sessionId: category.session.id },
        data: { isActive: false },
      });

      // Then activate the selected category
      return ctx.db.category.update({
        where: { id: input.categoryId },
        data: { isActive: true },
      });
    }),

  vote: publicProcedure
    .input(
      z.object({
        nominationId: z.string().min(1, "Nomination ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const deviceId = ctx.headers
          .get("cookie")
          ?.split(";")
          .find((c) => c.trim().startsWith(DEVICE_ID_COOKIE + "="))
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
            category: {
              include: {
                session: true,
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

        if (!nomination.category.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Voting is not currently active for this category",
          });
        }

        // Check if user has already voted for this nomination's category
        const existingVote = await ctx.db.vote.findFirst({
          where: {
            deviceId: deviceId,
            nomination: {
              categoryId: nomination.categoryId,
            },
          },
        });

        if (existingVote) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You have already voted in this category",
          });
        }

        return await ctx.db.vote.create({
          data: {
            deviceId: deviceId,
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

  hasVoted: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deviceId = ctx.headers
        .get("cookie")
        ?.split(";")
        .find((c) => c.trim().startsWith(DEVICE_ID_COOKIE + "="))
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
      } catch (error) {
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
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete category",
        });
      }
    }),

  deleteSession: publicProcedure
    .input(z.object({ id: z.string() }))
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
      } catch (error) {
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
      } catch (error) {
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
      } catch (error) {
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
});
