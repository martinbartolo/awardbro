import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

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

/**
 * A streamed response sends its headers before the procedures run, so anything they write to
 * the response headers would be lost silently. Fail loudly instead; the client sends mutations
 * without streaming (`src/trpc/links.ts`).
 */
class StreamedResponseHeaders extends Headers {
  append(): never {
    throw new Error("Can't set response headers on a streamed tRPC call");
  }
  set(): never {
    throw new Error("Can't set response headers on a streamed tRPC call");
  }
}

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ resHeaders, info }) =>
      createContext(
        req,
        info.accept === "application/jsonl"
          ? new StreamedResponseHeaders()
          : resHeaders,
      ),
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
