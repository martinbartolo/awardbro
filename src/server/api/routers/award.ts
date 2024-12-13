import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

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
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.session.findUnique({
        where: { slug: input.slug },
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

  addCategory: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        order: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.category.create({
        data: {
          sessionId: input.sessionId,
          name: input.name,
          description: input.description,
          order: input.order,
        },
      });
    }),

  getCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.category.findUnique({
        where: { id: input.id },
        include: {
          nominations: true,
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

  addVote: publicProcedure
    .input(z.object({ nominationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.vote.create({
        data: {
          nominationId: input.nominationId,
        },
      });
    }),
}); 