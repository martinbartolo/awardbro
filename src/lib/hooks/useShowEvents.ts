"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { connectShowEvents } from "~/lib/show-events";
import { useTRPC } from "~/trpc/react";

/**
 * Keeps this page's queries for the show up to date from its live events, while the page is open
 * (see connectShowEvents). `liveCounts` for pages that show live vote counts, `crowd` for voters'
 * phones (many identical pages, whose fetches after a host action are spread out).
 */
export function useShowEvents(
  code: string,
  { liveCounts, crowd = false }: { liveCounts: boolean; crowd?: boolean },
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  useEffect(
    () => connectShowEvents({ code, trpc, queryClient, liveCounts, crowd }),
    [code, trpc, queryClient, liveCounts, crowd],
  );
}
