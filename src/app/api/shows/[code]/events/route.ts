import { normalizeRoomCode } from "~/lib/join";
import { db } from "~/server/db";
import { eventHub } from "~/server/event-hub";
import { streamShowEvents } from "~/server/event-stream";

export const dynamic = "force-dynamic";
// Vercel's maximum on Hobby. The stream ends a little before it (STREAM_MS).
export const maxDuration = 300;

/**
 * A show's live events (see src/server/events.ts), for its open pages. Anyone with the room code
 * can listen, as anyone can load the show: events say only what changed, never scores or votes.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const show = await db.session.findUnique({
    where: { code: normalizeRoomCode(code) },
    select: { id: true },
  });
  if (!show) return new Response("Show not found", { status: 404 });

  try {
    return await streamShowEvents({
      hub: eventHub(),
      sessionId: show.id,
      signal: request.signal,
    });
  } catch (error) {
    console.error("Couldn't listen for live events:", error);
    // An empty stream, not an error status: `EventSource` gives up for good on an error status,
    // but connects again (after `retry`) when a stream ends
    const retryMs = 5_000 + Math.round(Math.random() * 5_000);
    return new Response(`retry: ${retryMs}\n\n`, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  }
}
