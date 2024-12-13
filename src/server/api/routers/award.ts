import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_COOKIE = "device_id";

export const awardRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.session.create({
        data: {
          name: input.name,
          slug: input.slug,
        },
      });
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
    .input(z.object({ 
      slug: z.string(),
      activeOnly: z.boolean().optional()
    }))
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

  addCategory: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.category.create({
        data: {
          sessionId: input.sessionId,
          name: input.name,
          description: input.description,
        },
      });
    }),

  getCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.category.findUnique({
        where: { id: input.id },
        include: {
          nominations: {
            include: {
              _count: {
                select: { votes: true }
              }
            }
          }
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

  addNomination: publicProcedure
    .input(
      z.object({
        categoryId: z.string(),
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.nomination.create({
        data: {
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
        },
      });
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
    .input(z.object({ nominationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deviceId = ctx.headers.get("cookie")?.split(";")
        .find(c => c.trim().startsWith(DEVICE_ID_COOKIE + "="))
        ?.split("=")[1];

      if (!deviceId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No device ID found",
        });
      }

      const nomination = await ctx.db.nomination.findUnique({
        where: { id: input.nominationId },
        include: { category: true },
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
          message: "Category is not active",
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
          message: "Already voted in this category",
        });
      }

      return ctx.db.vote.create({
        data: {
          deviceId: deviceId,
          nominationId: input.nominationId,
        },
      });
    }),

  hasVoted: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deviceId = ctx.headers.get("cookie")?.split(";")
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
}); 