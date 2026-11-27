import {
  hashKey,
  type QueryClient,
  type QueryFilters,
  type QueryKey,
} from "@tanstack/react-query";
import { type TRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { type AppRouter } from "~/server/api/root";

/** How often a page fetches the show while it can't get live events */
export const FALLBACK_REFETCH_MS = 30_000;
/** Connecting again after the browser gave up on the stream: 10–20 s, at random */
const RECONNECT_MS = 10_000;
/** After this many failed connections in a row (a deleted show), the page stops trying */
const MAX_RECONNECTS = 5;
/** Phones spread their fetches after a host action over this long, at random */
const SPREAD_MS = 1_000;

/**
 * Keeps a page's queries for a show up to date from the show's live events
 * (`/api/shows/<code>/events`, see "Live updates" in docs/architecture.md):
 *
 * - When the stream opens or reopens, and on a `show` event, the page fetches all its queries for
 *   the show again: the show, live counts and the voter's own votes.
 * - With `liveCounts` (the big screen and the run view), a `votes` event fetches that category's
 *   count again. Without it, the server leaves `votes` events out.
 * - With `crowd` (voters' phones, one of many identical pages), fetches after a host action are
 *   spread over a second, so a room full of phones doesn't fetch at once.
 * - While the stream isn't open, the page fetches the show every 30 s instead.
 * - While one of the page's own actions is on its way, the query it changed is fetched once it
 *   has settled, so a fetch never undoes what the page already shows (see optimistic.ts).
 *
 * `EventSource` connects again by itself when a stream ends. If it gives up for good (an error
 * status), this connects again after a while, up to 5 times in a row (a deleted show stays
 * deleted). Returns the function that stops listening.
 */
export function connectShowEvents({
  code,
  trpc,
  queryClient,
  liveCounts,
  crowd = false,
  EventSourceImpl = EventSource,
}: {
  code: string;
  trpc: TRPCOptionsProxy<AppRouter>;
  queryClient: QueryClient;
  liveCounts: boolean;
  crowd?: boolean;
  EventSourceImpl?: typeof EventSource;
}) {
  let stopped = false;

  // While one of the page's own actions is on its way (a step, a vote), fetching the query it
  // changed could bring back the data from before it, and undo what the page already shows. So
  // that query (named in the action's `meta.holds`, see optimistic.ts) is fetched once the action
  // has settled. Every other query is fetched straight away.
  /** Held queries, and when their event arrived */
  const waiting = new Map<string, number>();
  const heldQueries = () =>
    new Set(
      queryClient
        .getMutationCache()
        .findAll({ status: "pending" })
        .flatMap(mutation => {
          const holds = mutation.options.meta?.holds;
          return holds ? [hashKey(holds as QueryKey)] : [];
        }),
    );
  const fetchAgain = (filter: QueryFilters) => {
    if (stopped) return;
    const held = heldQueries();
    void queryClient.invalidateQueries({
      ...filter,
      predicate: query => {
        if (!held.has(query.queryHash)) return true;
        if (!waiting.has(query.queryHash)) {
          waiting.set(query.queryHash, Date.now());
        }
        return false;
      },
    });
  };
  const stopWaiting = queryClient.getMutationCache().subscribe(() => {
    if (!waiting.size || stopped) return;
    const held = heldQueries();
    for (const [hash, heldAt] of waiting) {
      if (held.has(hash)) continue;
      waiting.delete(hash);
      const query = queryClient.getQueryCache().get(hash);
      // The action fetched it as it settled, after the change it was held for: that will do
      if (
        !query ||
        (query.state.dataUpdatedAt > heldAt && !query.state.isInvalidated)
      ) {
        continue;
      }
      void queryClient.invalidateQueries({
        predicate: q => q.queryHash === hash,
      });
    }
  });

  const refetchShow = () => {
    fetchAgain(trpc.award.getSession.queryFilter());
    fetchAgain(trpc.award.getCategory.queryFilter());
    fetchAgain(trpc.award.getMyVotes.queryFilter());
  };
  // A fetch still on its way may have started before this vote was saved, so it's replaced
  const refetchCount = (categoryId: string) =>
    fetchAgain(trpc.award.getCategory.queryFilter({ id: categoryId }));

  const afterHostAction = crowd
    ? () => setTimeout(refetchShow, Math.random() * SPREAD_MS)
    : refetchShow;

  const url = `/api/shows/${encodeURIComponent(code)}/events${liveCounts ? "" : "?votes=0"}`;
  let source: EventSource | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;

  const connect = () => {
    source = new EventSourceImpl(url);
    // Changes made while the page wasn't listening (before it connected, or between streams)
    source.addEventListener("open", () => {
      failures = 0;
      refetchShow();
    });
    source.addEventListener("show", () => afterHostAction());
    source.addEventListener("votes", event => {
      const categoryId = parseCategoryId(event);
      if (categoryId) refetchCount(categoryId);
    });
    source.addEventListener("error", () => {
      if (source?.readyState !== EventSourceImpl.CLOSED || stopped) return;
      source.close();
      if (++failures > MAX_RECONNECTS) return;
      retry = setTimeout(connect, RECONNECT_MS * (1 + Math.random()));
    });
  };
  connect();

  const fallback = setInterval(() => {
    const listening = source?.readyState === EventSourceImpl.OPEN;
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!listening && !hidden) refetchShow();
  }, FALLBACK_REFETCH_MS);

  return () => {
    stopped = true;
    stopWaiting();
    clearTimeout(retry);
    clearInterval(fallback);
    source?.close();
  };
}

/** A `votes` event's category */
const parseCategoryId = (event: Event) => {
  try {
    const data = JSON.parse((event as MessageEvent<string>).data) as {
      categoryId?: unknown;
    };
    return typeof data.categoryId === "string" ? data.categoryId : undefined;
  } catch {
    return undefined;
  }
};
