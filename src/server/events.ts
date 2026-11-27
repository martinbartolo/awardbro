import "server-only";

import { z } from "zod";

import { Prisma } from "~/generated/prisma/client";

/**
 * Live events: after a write, the server tells the show's open pages what changed, so they can
 * fetch it again. Events carry no scores or votes: the database stays the only source of truth.
 *
 * - `show`: any host action: categories, nominations, the running order, a category's stage or
 *   reveal options, resetting votes, or deleting the show. Every page fetches the show again
 *   (with a reset, voters' own votes are gone too).
 * - `votes`: a voter voted (or ranked) in the category. Only pages that show live counts fetch
 *   again, so a burst of votes doesn't make every voter's phone fetch.
 *
 * They travel through Postgres: writes `NOTIFY` (`notifyShow`), and each server instance with open
 * pages `LISTEN`s (event-hub.ts) and streams them to the pages (`/api/shows/<code>/events`).
 */
const showEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("show") }),
  z.object({ type: z.literal("votes"), categoryId: z.string() }),
]);
export type ShowEvent = z.infer<typeof showEventSchema>;

/** The Postgres channel every show's events go through */
export const EVENTS_CHANNEL = "awardbro_events";

/** A notification's payload: the event and the show it's for */
const payloadSchema = z.object({ sessionId: z.string() }).and(showEventSchema);

/**
 * SQL that sends an event to the show's open pages, to select in a statement of the write's
 * transaction (such as the one taking the show's lock). Postgres delivers a notification only when
 * its transaction commits, so pages never hear of a write that was rolled back, and hear of writes
 * in the order they committed.
 */
export const notifyShow = (sessionId: string, event: ShowEvent) =>
  Prisma.sql`pg_notify(${EVENTS_CHANNEL}, ${JSON.stringify({ ...event, sessionId })})`;

/** Reads a notification's payload, or returns undefined for one that isn't a show event */
export const parseNotification = (payload: string | undefined) => {
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(payload ?? ""));
    return parsed.success ? parsed.data : undefined;
  } catch {
    // Not JSON: not one of ours
    return undefined;
  }
};
