import "server-only";

import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";

import { canManage } from "~/server/auth/manage-token";
import { getCookie } from "~/server/cookies";
import { db } from "~/server/db";

/**
 * Manage access for award shows.
 *
 * A host proves they can manage a show by entering its password (or by creating it). The server
 * then sets a signed, httpOnly cookie scoped to that one session. Every write route checks the
 * cookie with `assertCanManage` before touching the database. The token and cookie logic is in
 * `manage-token.ts`.
 *
 * Shows created without a password are intentionally open: anyone with the link can manage them.
 */

type ManageTarget =
  { sessionId: string } | { categoryId: string } | { nominationId: string };

/**
 * Throws unless the request is allowed to manage the session that owns the target.
 * Call this first in every route that changes a show.
 */
export const assertCanManage = async (
  ctx: { db: typeof db; headers: Headers },
  target: ManageTarget,
) => {
  const session = await ctx.db.session.findFirst({
    where:
      "sessionId" in target
        ? { id: target.sessionId }
        : "categoryId" in target
          ? { categories: { some: { id: target.categoryId } } }
          : {
              categories: {
                some: { nominations: { some: { id: target.nominationId } } },
              },
            },
    select: { id: true, password: true },
  });

  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Award show not found" });
  }

  if (!isHost(ctx, session)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Enter the management password to make changes",
    });
  }

  return session;
};

/** Whether the request comes from someone who can manage this show (without throwing) */
export const isHost = (
  ctx: { headers: Headers },
  session: { id: string; password: string | null },
) => canManage(session, name => getCookie(ctx.headers, name));

/** For Server Components: can the current visitor manage the show with this slug? */
export const hasManageAccess = async (slug: string) => {
  const session = await db.session.findUnique({
    where: { slug },
    select: { id: true, password: true },
  });
  if (!session) return false;

  const cookieStore = await cookies();
  return canManage(session, name => cookieStore.get(name)?.value);
};
