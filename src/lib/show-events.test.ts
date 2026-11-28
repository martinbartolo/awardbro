import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AppRouter } from "~/server/api/root";

import { connectShowEvents } from "./show-events";

/** Stands in for the browser's EventSource: the test sends its events */
class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static opened: FakeEventSource[] = [];

  readyState = FakeEventSource.CONNECTING;
  private listeners = new Map<string, ((event: Event) => void)[]>();

  constructor(readonly url: string) {
    FakeEventSource.opened.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  emit(type: string, data?: unknown) {
    if (type === "open") this.readyState = FakeEventSource.OPEN;
    const event = new MessageEvent(type, {
      data: data === undefined ? undefined : JSON.stringify(data),
    });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

const queryClient = new QueryClient();
const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient<AppRouter>({ links: [] }),
  queryClient,
});

/** The page's cached queries, by name */
const queries = {
  show: trpc.award.getSession.queryKey({ code: "K7QF", activeOnly: true }),
  // The vote page's
  activeCategory: trpc.award.getActiveCategory.queryKey({ code: "K7QF" }),
  categoryA: trpc.award.getCategory.queryKey({ id: "a" }),
  categoryB: trpc.award.getCategory.queryKey({ id: "b" }),
  myVotes: trpc.award.getMyVotes.queryKey({ categoryId: "a" }),
  // The homepage's room code lookup, which no event is about
  findShow: trpc.award.findShow.queryKey({ code: "K7QF" }),
};

/** The names of the queries an event marked for fetching again */
const invalidated = () =>
  Object.entries(queries)
    .filter(([, key]) => queryClient.getQueryState(key)?.isInvalidated)
    .map(([name]) => name)
    .sort();

let stops: (() => void)[] = [];

/** Connects as the big screen or run view (`liveCounts`), or as a voter's phone (`crowd`) */
const connect = (liveCounts: boolean) => {
  const stop = connectShowEvents({
    code: "K7QF",
    trpc,
    queryClient,
    liveCounts,
    crowd: !liveCounts,
    EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
  });
  stops.push(stop);
  return stop;
};

/** The most recent stream */
const stream = () => FakeEventSource.opened.at(-1)!;

const WHOLE_SHOW = [
  "activeCategory",
  "categoryA",
  "categoryB",
  "myVotes",
  "show",
];

beforeEach(() => {
  vi.useFakeTimers();
  FakeEventSource.opened = [];
  queryClient.clear();
  // What's cached doesn't matter, only which queries an event marks for fetching again
  for (const key of Object.values(queries)) {
    queryClient.setQueryData([...key], {});
  }
});

afterEach(() => {
  stops.forEach(stop => stop());
  stops = [];
  vi.useRealTimers();
});

describe("connectShowEvents", () => {
  it("listens to all the show's events on a page with live counts", () => {
    connect(true);

    expect(stream().url).toBe("/api/shows/K7QF/events");
  });

  it("asks for no votes events on a voter's phone", () => {
    connect(false);

    expect(stream().url).toBe("/api/shows/K7QF/events?votes=0");
  });

  it.each([
    ["open", true],
    ["open", false],
    ["show", true],
  ])(
    "fetches the whole show again straight away on %s (live counts: %s)",
    (type, liveCounts) => {
      connect(liveCounts);

      stream().emit(type, {});

      expect(invalidated()).toEqual(WHOLE_SHOW);
    },
  );

  it("spreads a phone's fetch after a host action over a second", () => {
    connect(false);

    stream().emit("show", {});
    expect(invalidated()).toEqual([]);

    vi.advanceTimersByTime(1_000);
    expect(invalidated()).toEqual(WHOLE_SHOW);
  });

  it("fetches only the category's live count again on a votes event", () => {
    connect(true);

    stream().emit("votes", { categoryId: "a" });

    expect(invalidated()).toEqual(["categoryA"]);
  });

  it("fetches nothing on a votes event without a category", () => {
    connect(true);

    stream().emit("votes", {});

    expect(invalidated()).toEqual([]);
  });

  describe("while the page's own action is on its way", () => {
    /** Starts an action that changed `holds` straight away, and settles when the returned function is called */
    const startAction = (holds: readonly unknown[]) => {
      let finish!: () => void;
      const done = new Promise<void>(resolve => (finish = resolve));
      const action = queryClient
        .getMutationCache()
        .build(queryClient, { mutationFn: () => done, meta: { holds } })
        .execute(undefined);
      return async () => {
        finish();
        await action;
      };
    };

    it("fetches the query it changed only once it settles", async () => {
      connect(true);
      const finish = startAction(queries.show);
      await vi.advanceTimersByTimeAsync(0);

      stream().emit("show", {});
      // Everything else straight away
      expect(invalidated()).toEqual([
        "activeCategory",
        "categoryA",
        "categoryB",
        "myVotes",
      ]);

      await finish();
      expect(invalidated()).toEqual(WHOLE_SHOW);
    });

    it("fetches the others straight away, so a slow vote doesn't hold up the host's next step", async () => {
      connect(false);
      startAction(queries.myVotes);
      await vi.advanceTimersByTimeAsync(0);

      stream().emit("show", {});
      await vi.advanceTimersByTimeAsync(1_000);

      expect(invalidated()).toEqual([
        "activeCategory",
        "categoryA",
        "categoryB",
        "show",
      ]);
    });

    it("doesn't fetch it again if the action already did, after the event", async () => {
      connect(true);
      const finish = startAction(queries.show);
      await vi.advanceTimersByTimeAsync(0);
      stream().emit("show", {});

      // The action fetches what the server has as it settles
      await vi.advanceTimersByTimeAsync(10);
      queryClient.setQueryData([...queries.show], { fetched: true });
      await finish();

      expect(invalidated()).not.toContain("show");
    });

    it("holds a live count it changed until the action settles", async () => {
      connect(true);
      const finish = startAction(queries.categoryB);
      await vi.advanceTimersByTimeAsync(0);

      stream().emit("votes", { categoryId: "b" });
      expect(invalidated()).toEqual([]);

      await finish();
      expect(invalidated()).toEqual(["categoryB"]);
    });
  });

  describe("the fallback", () => {
    it("fetches nothing while the stream is open", () => {
      connect(true);
      stream().emit("open");
      queryClient.clear();
      for (const key of Object.values(queries)) {
        queryClient.setQueryData([...key], {});
      }

      vi.advanceTimersByTime(60_000);

      expect(invalidated()).toEqual([]);
    });

    it("fetches the show every 30 seconds while the stream isn't open", () => {
      connect(true);

      vi.advanceTimersByTime(29_000);
      expect(invalidated()).toEqual([]);
      vi.advanceTimersByTime(1_000);
      expect(invalidated()).toEqual(WHOLE_SHOW);
    });
  });

  describe("when the stream fails", () => {
    it("leaves reconnecting to the browser while it is trying", () => {
      connect(true);

      // EventSource reports an error, then connects again by itself
      stream().emit("error");
      vi.advanceTimersByTime(60_000);

      expect(FakeEventSource.opened).toHaveLength(1);
    });

    it("connects again after a while once the browser has given up", () => {
      connect(true);
      const first = stream();

      first.readyState = FakeEventSource.CLOSED;
      first.emit("error");
      vi.advanceTimersByTime(20_000);

      expect(FakeEventSource.opened).toHaveLength(2);
      expect(first.readyState).toBe(FakeEventSource.CLOSED);
    });

    it("gives up after 5 failed connections in a row", () => {
      connect(true);

      for (let attempt = 0; attempt < 10; attempt++) {
        stream().readyState = FakeEventSource.CLOSED;
        stream().emit("error");
        vi.advanceTimersByTime(20_000);
      }

      // The first, then 5 more
      expect(FakeEventSource.opened).toHaveLength(6);
    });

    it("stops listening, and doesn't connect again, once stopped", () => {
      const stop = connect(true);
      const first = stream();

      stop();
      first.emit("error");
      vi.advanceTimersByTime(60_000);

      expect(first.readyState).toBe(FakeEventSource.CLOSED);
      expect(FakeEventSource.opened).toHaveLength(1);
      expect(invalidated()).toEqual([]);
    });
  });
});
