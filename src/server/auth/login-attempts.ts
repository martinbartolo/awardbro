import { TRPCError } from "@trpc/server";
import { createHmac } from "node:crypto";

import { env } from "~/env";
import { type db } from "~/server/db";

/**
 * Manage password attempts. Room codes are public, so a limit per show alone would let anyone
 * lock the host out by guessing wrong. Instead each client (IP address) gets a few attempts per
 * show, and the show as a whole gets a much higher cap, against guessing spread over many
 * addresses. Both are counted in the database, so they hold across server instances.
 */
export const CLIENT_LIMIT = 5;
export const SHOW_LIMIT = 50;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** The `client` of the row that counts every attempt on a show */
const WHOLE_SHOW = "show";

/**
 * Identifies the client that sent a request: a keyed hash of its IP address, so the database
 * never holds the address. On Vercel, `x-forwarded-for` is set by the platform, not the client.
 */
export const loginClient = (headers: Headers) => {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown";
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`login-attempt:${ip}`)
    .digest("base64url");
};

/**
 * Counts one attempt against a row, unless that row is already at `limit` within the lockout.
 * One statement, so parallel attempts can't all get past the limit. Returns whether it was
 * counted; if not, when the lockout ends (or null if the show no longer exists).
 */
const count = async (
  client: typeof db,
  sessionId: string,
  key: string,
  limit: number,
  now: Date,
) => {
  const lockoutStart = new Date(now.getTime() - LOCKOUT_MS);
  const counted = await client.$queryRaw<unknown[]>`
    INSERT INTO "LoginAttempt" ("sessionId", "client", "failures", "lastFailureAt")
    SELECT ${sessionId}, ${key}, 1, ${now}
    WHERE EXISTS (SELECT 1 FROM "Session" WHERE "id" = ${sessionId})
    ON CONFLICT ("sessionId", "client") DO UPDATE SET
      "failures" = CASE
        WHEN "LoginAttempt"."lastFailureAt" < ${lockoutStart} THEN 1
        ELSE "LoginAttempt"."failures" + 1
      END,
      "lastFailureAt" = ${now}
    WHERE "LoginAttempt"."failures" < ${limit}
      OR "LoginAttempt"."lastFailureAt" < ${lockoutStart}
    RETURNING 1`;
  if (counted.length > 0) return { counted: true } as const;

  const row = await client.loginAttempt.findUnique({
    where: { sessionId_client: { sessionId, client: key } },
  });
  return {
    counted: false,
    unlocksAt: row && new Date(row.lastFailureAt.getTime() + LOCKOUT_MS),
  } as const;
};

/**
 * Counts a password attempt, before the password is checked. Throws TOO_MANY_REQUESTS while
 * this client, or the show as a whole, is locked out. The client is checked first, and its
 * refused attempts aren't counted anywhere, so one client can't use up the show's cap. A correct
 * password clears both (`clearLoginAttempts`).
 */
export const countLoginAttempt = async (
  client: typeof db,
  sessionId: string,
  clientKey: string,
) => {
  const now = new Date();
  for (const [key, limit] of [
    [clientKey, CLIENT_LIMIT],
    [WHOLE_SHOW, SHOW_LIMIT],
  ] as const) {
    const result = await count(client, sessionId, key, limit, now);
    if (result.counted) continue;
    if (!result.unlocksAt) {
      // The show was deleted after it was looked up
      throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
    }
    const minutes = Math.max(
      1,
      Math.ceil((result.unlocksAt.getTime() - now.getTime()) / 60_000),
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}`,
    });
  }
};

/** Forgets a show's attempts, after the right password was entered */
export const clearLoginAttempts = (client: typeof db, sessionId: string) =>
  client.loginAttempt.deleteMany({ where: { sessionId } });
