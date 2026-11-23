import "server-only";

import { TRPCError } from "@trpc/server";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { env } from "~/env";
import { db } from "~/server/db";

/**
 * Manage access for award shows.
 *
 * A host proves they can manage a show by entering its password (or by creating it). The server
 * then sets a signed, httpOnly cookie scoped to that one session. Every write route checks the
 * cookie with `assertCanManage` before touching the database.
 *
 * Shows created without a password are intentionally open: anyone with the link can manage them.
 */

const COOKIE_PREFIX = "manage_";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const cookieName = (sessionId: string) => `${COOKIE_PREFIX}${sessionId}`;

const sign = (sessionId: string, expiresAt: number) =>
  createHmac("sha256", env.AUTH_SECRET)
    .update(`${sessionId}.${expiresAt}`)
    .digest("base64url");

export const createManageToken = (sessionId: string) => {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  return `${expiresAt}.${sign(sessionId, expiresAt)}`;
};

export const isValidManageToken = (
  sessionId: string,
  token: string | undefined,
) => {
  if (!token) return false;

  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!signature || !Number.isInteger(expiresAt)) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(sign(sessionId, expiresAt));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

/** Appends a Set-Cookie header granting manage access to one session. */
export const setManageCookie = (resHeaders: Headers, sessionId: string) => {
  const parts = [
    `${cookieName(sessionId)}=${createManageToken(sessionId)}`,
    "Path=/",
    `Max-Age=${MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  resHeaders.append("Set-Cookie", parts.join("; "));
};

export const getCookie = (headers: Headers, name: string) => {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return undefined;

  for (const pair of cookieHeader.split(";")) {
    const index = pair.indexOf("=");
    if (index === -1) continue;
    if (pair.slice(0, index).trim() === name) {
      return decodeURIComponent(pair.slice(index + 1).trim());
    }
  }
  return undefined;
};

/** True if the request may manage the session (no password set, or a valid cookie). */
export const canManage = (
  session: { id: string; password: string | null },
  getCookieValue: (name: string) => string | undefined,
) =>
  !session.password ||
  isValidManageToken(session.id, getCookieValue(cookieName(session.id)));

type ManageTarget =
  | { sessionId: string }
  | { categoryId: string }
  | { nominationId: string };

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

  if (!canManage(session, name => getCookie(ctx.headers, name))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Enter the management password to make changes",
    });
  }

  return session;
};

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
