import { httpBatchLink, httpBatchStreamLink, splitLink } from "@trpc/client";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";

/**
 * Queries are streamed, so each result in a batch arrives as soon as it's ready.
 * Mutations are not: a streamed response sends its headers before the
 * procedures run, which would drop cookies they set (the manage cookie from
 * createSession and verifyManageAccess).
 */
export const httpLinks = (opts: { url: string; fetch?: typeof fetch }) => {
  const options = {
    ...opts,
    transformer: SuperJSON,
    headers: () => ({ "x-trpc-source": "nextjs-react" }),
  };
  return splitLink<AppRouter>({
    condition: op => op.type === "mutation",
    true: httpBatchLink(options),
    false: httpBatchStreamLink(options),
  });
};
