import "server-only";

import { Client } from "pg";

import { env } from "~/env";
import {
  EVENTS_CHANNEL,
  parseNotification,
  type ShowEvent,
} from "~/server/events";
import { createThrottle } from "~/server/throttle";

/** How often a category's `votes` event reaches its pages at most, during a burst of votes */
const VOTES_THROTTLE_MS = 500;
/** How long connecting to the database may take before the hub gives up */
const CONNECT_TIMEOUT_MS = 5_000;
/**
 * How often the hub checks its connection still works. A listening connection only receives, so a
 * connection dropped somewhere along the way (a proxy timing out) may never report an error.
 */
const HEALTH_CHECK_MS = 30_000;

/** Names the hub's connections in pg_stat_activity, so it shows how many instances listen */
const APPLICATION_NAME = "awardbro-events";

/**
 * The hub's connection string. Its name goes in the string, as a name in it would win over the
 * client's options. pg checks the server's certificate for `sslmode=require` (Neon's connection
 * strings) as for `verify-full`, and warns at every cold start that this will change: asking for
 * `verify-full` keeps that check and the logs quiet. With `uselibpqcompat`, pg gives those modes
 * libpq's meaning, so they stay as they are.
 */
export function listenerConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.set("application_name", APPLICATION_NAME);
  const mode = url.searchParams.get("sslmode");
  if (
    !url.searchParams.has("uselibpqcompat") &&
    (mode === "prefer" || mode === "require" || mode === "verify-ca")
  ) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

type Subscriber = {
  onEvent: (event: ShowEvent) => void;
  /** The hub lost its connection to the database: the page should connect again */
  onClose: () => void;
};

/**
 * Passes live events (see events.ts) from the database to the pages open on this server instance.
 *
 * It holds one `LISTEN` connection while any page is subscribed, opened by the first and closed
 * when the last one leaves. It needs a direct connection (`DATABASE_DIRECT_URL`): Neon's pooler
 * can't `LISTEN`. Each show's `votes` events are throttled per category, so a burst of votes
 * makes a few fetches rather than one per vote. If the connection drops, every subscriber is
 * closed, so its page connects again and fetches what it missed.
 */
export function createEventHub(connectionString: string) {
  /** Subscribers by show */
  const shows = new Map<string, Set<Subscriber>>();
  const throttle = createThrottle(VOTES_THROTTLE_MS);
  let current: { client: Client; ready: Promise<void> } | null = null;

  const deliver = (sessionId: string, event: ShowEvent) => {
    for (const subscriber of shows.get(sessionId) ?? []) {
      subscriber.onEvent(event);
    }
  };

  const disconnect = () => {
    const client = current?.client;
    current = null;
    throttle.clear();
    void client?.end().catch(() => undefined);
  };

  /** Drops every subscriber, telling each the connection was lost */
  const closeAll = () => {
    const closed = [...shows.values()].flatMap(set => [...set]);
    shows.clear();
    for (const subscriber of closed) subscriber.onClose();
  };

  const connect = () => {
    if (current) return current.ready;

    const client = new Client({
      connectionString: listenerConnectionString(connectionString),
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      keepAlive: true,
    });
    const ready = client
      .connect()
      .then(() => client.query(`LISTEN ${EVENTS_CHANNEL}`))
      .then(() => undefined);
    const connection = { client, ready };
    current = connection;

    let healthCheck: ReturnType<typeof setInterval> | undefined;
    const lost = () => {
      clearInterval(healthCheck);
      if (current !== connection) return;
      disconnect();
      closeAll();
    };
    client.on("error", lost);
    client.on("end", lost);
    ready.then(() => {
      // Lost as it opened
      if (current !== connection) return;
      healthCheck = setInterval(() => {
        // No answer in time counts as lost too
        const timeout = setTimeout(lost, CONNECT_TIMEOUT_MS);
        client.query("SELECT 1").then(() => clearTimeout(timeout), lost);
      }, HEALTH_CHECK_MS);
    }, lost);

    client.on("notification", message => {
      if (message.channel !== EVENTS_CHANNEL) return;
      const notification = parseNotification(message.payload);
      // Every show's events come through one channel: skip those nobody here is watching
      if (!notification || !shows.has(notification.sessionId)) return;
      const { sessionId, ...event } = notification;
      if (event.type === "votes") {
        throttle.run(`${sessionId}:${event.categoryId}`, () =>
          deliver(sessionId, event),
        );
      } else {
        deliver(sessionId, event);
      }
    });

    return ready;
  };

  const remove = (sessionId: string, subscriber: Subscriber) => {
    const set = shows.get(sessionId);
    if (!set?.delete(subscriber)) return false;
    if (set.size === 0) shows.delete(sessionId);
    return true;
  };

  return {
    /**
     * Starts passing a show's events to `onEvent`. Resolves once the hub is listening, so a page
     * that fetches after this can't miss a change. Returns the function that unsubscribes.
     */
    async subscribe(
      sessionId: string,
      onEvent: Subscriber["onEvent"],
      onClose: Subscriber["onClose"],
    ) {
      const subscriber = { onEvent, onClose };
      // Added before connecting, so the connection stays open for it, and dropping the
      // connection as it opens drops this subscriber too
      let set = shows.get(sessionId);
      if (!set) shows.set(sessionId, (set = new Set()));
      set.add(subscriber);
      try {
        await connect();
      } catch (error) {
        remove(sessionId, subscriber);
        throw error;
      }
      if (!shows.get(sessionId)?.has(subscriber)) {
        throw new Error("Lost the connection");
      }
      return () => {
        if (remove(sessionId, subscriber) && shows.size === 0) disconnect();
      };
    },

    /** The number of pages subscribed on this instance */
    get size() {
      let size = 0;
      for (const set of shows.values()) size += set.size;
      return size;
    },

    /** Closes the connection and drops every subscriber, without telling them */
    close() {
      shows.clear();
      disconnect();
    },
  };
}

export type EventHub = ReturnType<typeof createEventHub>;

const globalForHub = globalThis as unknown as { eventHub?: EventHub };

/** This server instance's hub */
export const eventHub = () =>
  (globalForHub.eventHub ??= createEventHub(env.DATABASE_DIRECT_URL));
