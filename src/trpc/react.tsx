"use client";

import { useState } from "react";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, loggerLink } from "@trpc/client";
import { type inferRouterOutputs } from "@trpc/server";
import { createTRPCContext } from "@trpc/tanstack-react-query";

import { type AppRouter } from "~/server/api/root";

import { httpLinks } from "./links";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

/**
 * `useTRPC()` gives each procedure's query keys and options for TanStack Query, e.g.
 * `useQuery(trpc.award.getCategory.queryOptions({ id }))`.
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/** What each procedure returns, e.g. `RouterOutputs["award"]["getCategory"]` */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: op =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),

        httpLinks({ url: getBaseUrl() + "/api/trpc" }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
