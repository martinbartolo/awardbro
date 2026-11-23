import {
  createTRPCClient,
  httpBatchStreamLink,
  type TRPCLink,
} from "@trpc/client";
import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import SuperJSON from "superjson";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "~/app/api/trpc/[trpc]/route";
import { type AppRouter } from "~/server/api/root";
import { cookieName } from "~/server/auth/manage";

import { httpLinks } from "./links";

const TRPC_URL = "http://localhost/api/trpc";
const SESSION = { id: "session-a", name: "Show", slug: "show" };
const PASSWORD = "correct horse";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const db = vi.hoisted(() => ({
  session: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("~/server/db", () => ({ db }));

/**
 * A tRPC client that calls the real API route, so it sees exactly what the
 * browser would receive.
 */
const createClient = (
  link: (fetch: typeof globalThis.fetch) => TRPCLink<AppRouter> = fetch =>
    httpLinks({ url: TRPC_URL, fetch }),
) => {
  const setCookies: string[] = [];
  const streamed: boolean[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    streamed.push(req.headers.get("trpc-accept") === "application/jsonl");
    const res = await POST(req as NextRequest);
    setCookies.push(...res.headers.getSetCookie());
    return res;
  };
  const client = createTRPCClient<AppRouter>({ links: [link(fetch)] });
  return { client, setCookies, streamed };
};

beforeEach(() => {
  vi.clearAllMocks();
  db.session.create.mockResolvedValue(SESSION);
  db.session.findMany.mockResolvedValue([]);
  db.session.findUnique.mockResolvedValue({
    id: SESSION.id,
    password: PASSWORD_HASH,
  });
});

describe("manage cookie over the client links", () => {
  it("is set when creating a show", async () => {
    const { client, setCookies } = createClient();

    await client.award.createSession.mutate({
      name: SESSION.name,
      slug: SESSION.slug,
    });

    expect(setCookies).toEqual([
      expect.stringContaining(`${cookieName(SESSION.id)}=`),
    ]);
  });

  it("is set after entering the correct password", async () => {
    const { client, setCookies } = createClient();

    await client.award.verifyManageAccess.mutate({
      slug: SESSION.slug,
      password: PASSWORD,
    });

    expect(setCookies).toEqual([
      expect.stringContaining(`${cookieName(SESSION.id)}=`),
    ]);
  });

  it("still streams queries", async () => {
    const { client, streamed } = createClient();

    await client.award.getPublicSessions.query();

    expect(streamed).toEqual([true]);
  });
});

describe("streamed mutations from an out-of-date page", () => {
  const createStreamingClient = () =>
    createClient(fetch =>
      httpBatchStreamLink({ transformer: SuperJSON, url: TRPC_URL, fetch }),
    );

  it("are rejected before creating a show", async () => {
    const { client } = createStreamingClient();

    await expect(
      client.award.createSession.mutate({
        name: SESSION.name,
        slug: SESSION.slug,
      }),
    ).rejects.toThrow("Please reload it");
    expect(db.session.create).not.toHaveBeenCalled();
  });

  it("are rejected before checking the password", async () => {
    const { client } = createStreamingClient();

    await expect(
      client.award.verifyManageAccess.mutate({
        slug: SESSION.slug,
        password: PASSWORD,
      }),
    ).rejects.toThrow("Please reload it");
    expect(db.session.findUnique).not.toHaveBeenCalled();
  });
});
