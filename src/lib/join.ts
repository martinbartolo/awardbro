/** A show's vote page, where voters join it */
export const voteUrl = (origin: string, code: string) =>
  `${origin}/vote/${code}`;

/**
 * A room code as stored, from what someone typed: without spaces and in capitals. A pasted vote
 * link works too, such as awardbro.com/vote/K7QF.
 */
export const normalizeRoomCode = (input: string) =>
  (input.split(/[?#]/)[0]!.split("/").filter(Boolean).at(-1) ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
