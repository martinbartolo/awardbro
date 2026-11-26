import "server-only";

import { cache } from "react";

import { headers } from "next/headers";

import { createCaller } from "~/server/api/root";
import {
  createTRPCContext,
  UnwritableResponseHeaders,
} from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
    resHeaders: new UnwritableResponseHeaders(),
  });
});

/** Calls the API directly from Server Components, e.g. `await api.award.getSession(...)` */
export const api = createCaller(createContext);
