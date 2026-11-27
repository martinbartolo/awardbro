/** Each page of a show, by its room code */
export const showPaths = {
  vote: (code: string) => `/vote/${code}`,
  manage: (code: string) => `/manage/${code}`,
  run: (code: string) => `/manage/${code}/run`,
  present: (code: string) => `/present/${code}`,
};

/** A show's vote page, where voters join it */
export const voteUrl = (origin: string, code: string) =>
  `${origin}${showPaths.vote(code)}`;

/**
 * A room code as stored, from what someone typed: without spaces and in capitals. A pasted vote
 * link works too, such as awardbro.com/vote/K7QF.
 */
export const normalizeRoomCode = (input: string) =>
  (input.split(/[?#]/)[0]!.split("/").filter(Boolean).at(-1) ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
