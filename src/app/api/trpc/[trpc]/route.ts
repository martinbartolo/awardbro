import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter } from "~/server/api/root";
import {
  createTRPCContext,
  UnwritableResponseHeaders,
} from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = (req: NextRequest, resHeaders: Headers) => {
  return createTRPCContext({
    headers: req.headers,
    resHeaders,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ resHeaders, info }) => {
      // A streamed response sends its headers before the procedures run, so cookies set by a
      // mutation would be lost. The client sends mutations without streaming
      // (`src/trpc/links.ts`); reject them before anything runs, in case a page loaded before
      // that change still streams them.
      if (info.accept !== "application/jsonl") {
        return createContext(req, resHeaders);
      }
      if (info.type === "mutation") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This page is out of date. Please reload it and try again.",
        });
      }
      return createContext(req, new UnwritableResponseHeaders());
    },
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
