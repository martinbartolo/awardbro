import "server-only";

import { cache } from "react";

import { notFound, permanentRedirect } from "next/navigation";

import { showPaths } from "~/lib/join";
import { db } from "~/server/db";

/**
 * The show a /vote, /manage or /present URL points to (its code and name), or null. URLs use
 * the room code (e.g. /vote/G34R). Links from before room codes use the show's slug, and a code
 * typed in lowercase still finds it.
 *
 * An exact match wins: codes are capitals and slugs lowercase, so an old link whose slug reads
 * like another show's code still opens its own show. (The room code migrations make sure no code
 * reads like another show's slug in any case, so this is only a safeguard.)
 */
export const findShowByUrl = async (client: typeof db, param: string) => {
  const code = param.toUpperCase();
  const matches = await client.session.findMany({
    where: { OR: [{ code }, { slug: param }] },
    select: { code: true, slug: true, name: true },
  });
  const show =
    matches.find(match => match.code === param) ??
    matches.find(match => match.slug === param) ??
    matches.at(0);
  return show ? { code: show.code, name: show.name } : null;
};

/** Once per request, since a page and its metadata both look the show up */
const findShowOnce = cache((param: string) => findShowByUrl(db, param));

/**
 * The show a page's URL points to: its room code, and its name for the page's metadata. A
 * missing show is a 404, and any other form of the URL (an old slug link, a lowercase code)
 * redirects permanently to the code URL.
 */
export const showPage = async (page: keyof typeof showPaths, param: string) => {
  const show = await findShowOnce(param);
  if (!show) notFound();
  if (show.code !== param) permanentRedirect(showPaths[page](show.code));
  return show;
};
