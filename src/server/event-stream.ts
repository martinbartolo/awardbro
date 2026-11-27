import "server-only";

import { type EventHub } from "~/server/event-hub";

/**
 * How long one stream stays open. Vercel ends a function after its maximum duration (300 s on
 * Hobby, the route's `maxDuration`). Ending the stream first closes it cleanly, rather than as a
 * timeout, and `EventSource` connects again by itself. Each stream takes up to a minute less, at
 * random, so pages that connected together don't all connect again together.
 */
const STREAM_MS = 280_000;
const STREAM_JITTER_MS = 60_000;
/** A comment line this often keeps proxies from closing a quiet stream */
const HEARTBEAT_MS = 20_000;
/**
 * How soon `EventSource` connects again after the stream ends: 1–2 s, at random, so pages whose
 * streams ended together (when the hub loses the database) don't all connect again together
 */
const retryMs = () => 1_000 + Math.round(Math.random() * 1_000);

const encoder = new TextEncoder();
const PING = encoder.encode(": ping\n\n");

/**
 * A show's live events as Server-Sent Events: `event: show` or `event: votes`, with the rest of
 * the event as JSON data (see events.ts). The response starts once the hub is listening, so a
 * page that fetches when the stream opens (`EventSource`'s `open` event) misses nothing.
 */
export async function streamShowEvents({
  hub,
  sessionId,
  signal,
  streamMs = STREAM_MS - Math.random() * STREAM_JITTER_MS,
  heartbeatMs = HEARTBEAT_MS,
}: {
  hub: EventHub;
  sessionId: string;
  /** Aborts when the page goes away */
  signal: AbortSignal;
  streamMs?: number;
  heartbeatMs?: number;
}) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  // Set by `end`, which the page or the hub can call at any time
  let ended = false as boolean;
  let unsubscribe: (() => void) | undefined = undefined;
  let stop: ReturnType<typeof setTimeout> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;

  const end = () => {
    if (ended) return;
    ended = true;
    clearTimeout(stop);
    clearInterval(ping);
    unsubscribe?.();
    try {
      controller.close();
    } catch {
      // Already closed by the page going away
    }
  };
  const send = (bytes: Uint8Array) => {
    if (ended) return;
    try {
      controller.enqueue(bytes);
    } catch {
      end();
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel: end,
  });

  unsubscribe = await hub.subscribe(
    sessionId,
    ({ type, ...data }) =>
      send(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)),
    end,
  );
  if (signal.aborted) end();
  // Unless the page went away or the hub closed the stream meanwhile
  if (!ended) {
    signal.addEventListener("abort", end, { once: true });
    send(encoder.encode(`retry: ${retryMs()}\n\n`));
    stop = setTimeout(end, streamMs);
    ping = setInterval(() => send(PING), heartbeatMs);
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Tells proxies such as nginx not to buffer the stream
      "X-Accel-Buffering": "no",
    },
  });
}
