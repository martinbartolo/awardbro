import { type TRPCError } from "@trpc/server";
import { randomInt, randomUUID } from "node:crypto";
import { expect } from "vitest";

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { DEVICE_ID_COOKIE } from "~/server/cookies";

import { testDb } from "./db";

/**
 * Someone using the app, like a browser would: they have their own device cookie, and keep every
 * cookie the API sets for them (such as a manage cookie after creating a show).
 */
export function visitor({
  deviceId = randomUUID(),
  // Each visitor comes from its own address unless a test says otherwise
  ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}`,
}: { deviceId?: string | null; ip?: string } = {}) {
  const cookies = new Map<string, string>();
  if (deviceId) cookies.set(DEVICE_ID_COOKIE, deviceId);

  /** Response headers that store Set-Cookie in this visitor's cookies */
  class CookieJar extends Headers {
    append(name: string, value: string) {
      super.append(name, value);
      if (name.toLowerCase() !== "set-cookie") return;
      const pair = value.split(";")[0]!;
      const index = pair.indexOf("=");
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }

  const api = createCaller(() => ({
    ...createTRPCContext({
      headers: new Headers({
        cookie: [...cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
        "x-forwarded-for": ip,
      }),
      resHeaders: new CookieJar(),
    }),
    db: testDb,
  })).award;

  return { api, cookies, deviceId };
}

export type Visitor = ReturnType<typeof visitor>;

/** Expects the call to fail with this tRPC error code */
export const expectError = (call: Promise<unknown>, code: TRPCError["code"]) =>
  expect(call).rejects.toMatchObject({ code });
