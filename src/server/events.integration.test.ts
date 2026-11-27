import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "~/generated/prisma/client";
import { createEventHub, type EventHub } from "~/server/event-hub";
import { streamShowEvents } from "~/server/event-stream";
import { EVENTS_CHANNEL, notifyShow, type ShowEvent } from "~/server/events";
import { testDatabaseUrl } from "~/test/integration/database-url";
import { testDb } from "~/test/integration/db";
import {
  awardPaths,
  createShow,
  open,
  procedureNames,
  votedShow,
  writeRoutes,
} from "~/test/integration/show";
import { visitor } from "~/test/integration/visitor";

let hubs: EventHub[] = [];

/** A hub of its own, as a fresh server instance has, closed after the test */
const newHub = () => {
  const hub = createEventHub(testDatabaseUrl());
  hubs.push(hub);
  return hub;
};

afterEach(() => {
  hubs.forEach(hub => hub.close());
  hubs = [];
});

/** Subscribes to a show's events, collecting them */
const listen = async (hub: EventHub, sessionId: string) => {
  const events: ShowEvent[] = [];
  const closed = vi.fn();
  const unsubscribe = await hub.subscribe(
    sessionId,
    event => events.push(event),
    closed,
  );
  return { events, closed, unsubscribe };
};

/**
 * Long enough for a notification that was going to arrive to have arrived (and, at 1 s, for a
 * throttled one at the end of a burst)
 */
const settle = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

/** The event each write route sends, for the show the route is called on (see writeRoutes) */
const expectedEvents = (normalId: string) =>
  ({
    addCategory: { type: "show" },
    addNomination: { type: "show" },
    moveCategory: { type: "show" },
    updateCategory: { type: "show" },
    updateNomination: { type: "show" },
    setCategoryStage: { type: "show" },
    setRevealOptions: { type: "show" },
    resetCategoryVotes: { type: "votes", categoryId: normalId },
    resetAllVotes: { type: "votes" },
    deleteNomination: { type: "show" },
    deleteCategory: { type: "show" },
    deleteSession: { type: "show" },
  }) satisfies Record<keyof typeof writeRoutes, ShowEvent>;

it("covers every route that changes a show", () => {
  // Creating a show and entering its password change nothing a page shows; voting is tested below
  const silent = ["createSession", "verifyManageAccess"];
  const voting = ["vote", "submitRanking"];
  expect(procedureNames("mutation")).toEqual(
    awardPaths([...silent, ...voting, ...Object.keys(writeRoutes)]),
  );
});

describe("write routes", () => {
  it.each(Object.entries(writeRoutes))(
    "%s tells the show's pages, and no other show's",
    async (route, call) => {
      const { host, show } = await votedShow();
      const other = await votedShow();
      const hub = newHub();
      // Subscribed on a fresh hub just before the write, as a page that has just connected
      const [mine, theirs] = await Promise.all([
        listen(hub, show.show.id),
        listen(hub, other.show.show.id),
      ]);

      await call(host.api, show);

      const expected = expectedEvents(show.normal.id)[
        route as keyof typeof writeRoutes
      ];
      await vi.waitFor(() => expect(mine.events).toEqual([expected]));
      await settle();
      expect(mine.events).toEqual([expected]);
      expect(theirs.events).toEqual([]);
    },
  );

  it("sends nothing when the write fails", async () => {
    const host = visitor();
    const show = await createShow(host);
    const { events } = await listen(newHub(), show.show.id);

    // An aggregate can't be opened for voting
    await expect(
      host.api.setCategoryStage({ id: show.aggregate.id, stage: "open" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await settle();

    expect(events).toEqual([]);
  });

  it("sends an event only once its transaction commits", async () => {
    const show = await createShow(visitor());
    const { events } = await listen(newHub(), show.show.id);

    await expect(
      testDb.$transaction(async tx => {
        await tx.$queryRaw`SELECT 1 FROM ${notifyShow(show.show.id, { type: "show" })}`;
        throw new Error("Rolled back");
      }),
    ).rejects.toThrow("Rolled back");
    await settle();

    expect(events).toEqual([]);
  });
});

describe("votes", () => {
  it("a vote tells the show's pages which category it's in", async () => {
    const host = visitor();
    const show = await createShow(host);
    await open(host, show.normal.id);
    const { events } = await listen(newHub(), show.show.id);

    await visitor().api.vote({ nominationId: show.film("normal", "Dune").id });

    await vi.waitFor(() =>
      expect(events).toEqual([{ type: "votes", categoryId: show.normal.id }]),
    );
  });

  it("a ranking tells the show's pages which category it's in", async () => {
    const host = visitor();
    const show = await createShow(host);
    await open(host, show.ranking.id);
    const { events } = await listen(newHub(), show.show.id);

    await visitor().api.submitRanking({
      categoryId: show.ranking.id,
      rankings: [
        { nominationId: show.film("ranking", "Dune").id, rank: 1 },
        { nominationId: show.film("ranking", "Barbie").id, rank: 2 },
      ],
    });

    await vi.waitFor(() =>
      expect(events).toEqual([{ type: "votes", categoryId: show.ranking.id }]),
    );
  });

  it("a refused vote tells nobody", async () => {
    const show = await createShow(visitor());
    const { events } = await listen(newHub(), show.show.id);

    // Voting hasn't opened
    await expect(
      visitor().api.vote({ nominationId: show.film("normal", "Dune").id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await settle();

    expect(events).toEqual([]);
  });

  it("a burst of votes becomes a few events", async () => {
    const host = visitor();
    const show = await createShow(host);
    await open(host, show.normal.id);
    const { events } = await listen(newHub(), show.show.id);

    await Promise.all(
      Array.from({ length: 20 }, () =>
        visitor().api.vote({ nominationId: show.film("normal", "Dune").id }),
      ),
    );
    await settle(1000);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.length).toBeLessThan(20);
    expect(new Set(events.map(e => JSON.stringify(e)))).toEqual(
      new Set([JSON.stringify({ type: "votes", categoryId: show.normal.id })]),
    );
  });
});

describe("the hub", () => {
  it("closes the connection when the last page leaves, and opens it again", async () => {
    const host = visitor();
    const show = await createShow(host);
    const hub = newHub();

    const first = await listen(hub, show.show.id);
    first.unsubscribe();
    expect(hub.size).toBe(0);
    await vi.waitFor(async () => expect(await listeners()).toBe(0));

    const second = await listen(hub, show.show.id);
    await writeRoutes.setRevealOptions(host.api, show);
    await vi.waitFor(() => expect(second.events).toEqual([{ type: "show" }]));
    expect(first.events).toEqual([]);
  });

  it("closes every page when it loses the database, so they connect again", async () => {
    const show = await createShow(visitor());
    const hub = newHub();
    const page = await listen(hub, show.show.id);

    await testDb.$queryRaw`
      SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ${listening}`;

    await vi.waitFor(() => expect(page.closed).toHaveBeenCalledOnce());
    expect(hub.size).toBe(0);
    // A page connecting again gets a new connection
    await listen(hub, show.show.id);
    expect(await listeners()).toBe(1);
  });
});

/** Picks the connections in pg_stat_activity listening for events */
const listening = Prisma.sql`datname = current_database() AND query = ${`LISTEN ${EVENTS_CHANNEL}`}`;

/** The number of database connections listening for events */
const listeners = async () => {
  const [row] = await testDb.$queryRaw<[{ count: bigint }]>`
    SELECT count(*) FROM pg_stat_activity WHERE ${listening}`;
  return Number(row.count);
};

describe("the event stream", () => {
  /** Reads Server-Sent Events from a response until `until` is true of the text so far */
  const readUntil = async (
    response: Response,
    until: (text: string) => boolean,
  ) => {
    const reader = response
      .body!.pipeThrough(new TextDecoderStream())
      .getReader();
    let text = "";
    while (!until(text)) {
      const { value, done } = await reader.read();
      if (done) break;
      text += value;
    }
    reader.releaseLock();
    return text;
  };

  it("streams the show's events as Server-Sent Events", async () => {
    const host = visitor();
    const show = await createShow(host);
    await open(host, show.normal.id);
    const response = await streamShowEvents({
      hub: newHub(),
      sessionId: show.show.id,
      signal: new AbortController().signal,
    });
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");

    await writeRoutes.setRevealOptions(host.api, show);
    await visitor().api.vote({ nominationId: show.film("normal", "Dune").id });

    const text = await readUntil(response, t => t.includes("event: votes"));
    expect(text).toMatch(/^retry: 1\d{3}\n\n/);
    expect(text.replace(/^retry: \d+\n\n/, "")).toBe(
      "event: show\ndata: {}\n\n" +
        `event: votes\ndata: {"categoryId":"${show.normal.id}"}\n\n`,
    );
  });

  it("sends a heartbeat, then ends and unsubscribes after its time", async () => {
    const show = await createShow(visitor());
    const hub = newHub();
    const response = await streamShowEvents({
      hub,
      sessionId: show.show.id,
      signal: new AbortController().signal,
      streamMs: 250,
      heartbeatMs: 100,
    });

    // Read to the end of the stream
    const text = await readUntil(response, () => false);

    expect(text).toContain(": ping\n\n");
    expect(hub.size).toBe(0);
  });

  it("unsubscribes when the page goes away", async () => {
    const show = await createShow(visitor());
    const hub = newHub();
    const page = new AbortController();
    await streamShowEvents({
      hub,
      sessionId: show.show.id,
      signal: page.signal,
    });
    expect(hub.size).toBe(1);

    page.abort();

    expect(hub.size).toBe(0);
  });
});
