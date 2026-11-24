import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { env } from "~/env";

/** Signed manage-access tokens and the manage cookie. No database: see `manage.ts` for the checks. */

const COOKIE_PREFIX = "manage_";
export const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const cookieName = (sessionId: string) => `${COOKIE_PREFIX}${sessionId}`;

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

/** True if the request may manage the session (no password set, or a valid cookie). */
export const canManage = (
  session: { id: string; password: string | null },
  getCookieValue: (name: string) => string | undefined,
) =>
  !session.password ||
  isValidManageToken(session.id, getCookieValue(cookieName(session.id)));
