/**
 * Image links for image categories. AwardBro doesn't store pictures: hosts paste a link to a
 * picture that's hosted somewhere else, and voters' phones load it from there. People mostly copy
 * page or share links rather than the picture's own address, so the common ones are turned into
 * the direct address the picture loads from.
 */

import { MAX_DESCRIPTION } from "~/lib/schemas";

/**
 * A pasted link as the address to load the picture from, or why it can't be one. `obvious` when
 * the address is plainly a picture: an image file, or a Google Drive file (see isImageUrl).
 */
type ImageLink = { url: string; obvious: boolean } | { error: string };

/** What to tell a host whose link doesn't open as a picture */
export const COPY_IMAGE_ADDRESS =
  'Open the picture, right-click it (or press and hold on a phone), choose "Copy image address" and paste that here.';

const SIGN_IN_ONLY =
  "links only open for people signed in to your account, so voters can't see them. Share the picture from Google Drive, Dropbox or imgur instead.";

const NOT_A_LINK = "That isn't a link. It should start with https://";

const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|avif|svg|bmp|ico)$/i;

/** A link's address and its site's name, without "www." or "m.", or null if it isn't a URL */
const parseUrl = (text: string) => {
  try {
    const url = new URL(text.trim());
    return { url, host: url.hostname.toLowerCase().replace(/^(www|m)\./, "") };
  } catch {
    return null;
  }
};

/** Base64url, as OneDrive's sharing API expects a share link */
const base64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

/**
 * Turns a link a host pasted into the address to load the picture from:
 *
 * - Google Drive file links → Drive's thumbnail address, which other sites can show
 * - imgur picture pages → the picture on i.imgur.com
 * - Dropbox share links → the raw file
 * - OneDrive share links → the file's content, through OneDrive's sharing API
 *
 * Any other https link is kept as it is: whether it opens as a picture is only known once a
 * browser loads it (the form's preview). Links that need a sign-in, and album or folder links, are
 * refused with the reason. Converting an address this returns gives the same address again, so
 * older links stored as they were pasted can be converted when they're shown.
 */
export function parseImageLink(link: string): ImageLink {
  const converted = convert(link);
  if ("url" in converted && converted.url.length > MAX_DESCRIPTION) {
    return { error: `That link is too long. ${COPY_IMAGE_ADDRESS}` };
  }
  return converted;
}

function convert(link: string): ImageLink {
  if (!link.trim()) return { error: "Paste a link to the picture" };
  const parsed = parseUrl(link);
  if (!parsed) return { error: NOT_A_LINK };
  const { url, host } = parsed;
  // Pages on AwardBro are https, so browsers won't show a picture over http; most sites have both
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") return { error: NOT_A_LINK };
  const path = url.pathname;
  const kept = () => ({
    url: url.toString(),
    obvious: IMAGE_EXTENSION.test(path),
  });

  if (
    host === "photos.google.com" ||
    host === "photos.app.goo.gl" ||
    (host === "goo.gl" && path.startsWith("/photos"))
  ) {
    return { error: `Google Photos ${SIGN_IN_ONLY}` };
  }
  if (host === "icloud.com" || host.endsWith(".icloud.com")) {
    return { error: `iCloud ${SIGN_IN_ONLY}` };
  }

  if (host === "drive.google.com") {
    const fileId =
      /\/file\/d\/([\w-]+)/.exec(path)?.[1] ?? url.searchParams.get("id");
    if (!fileId) {
      return {
        error: `That's a Google Drive folder, not a picture. ${COPY_IMAGE_ADDRESS}`,
      };
    }
    // Files shared before 2021 also need their resource key
    const resourceKey = url.searchParams.get("resourcekey");
    return {
      url:
        `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600` +
        (resourceKey ? `&resourcekey=${encodeURIComponent(resourceKey)}` : ""),
      obvious: true,
    };
  }

  if (host === "imgur.com") {
    if (/^\/(a|gallery|t|user)\//.test(path)) {
      return {
        error: `That's an imgur album or page, not one picture. ${COPY_IMAGE_ADDRESS}`,
      };
    }
    // A picture's page: imgur ids are 5 to 7 random letters and digits, unlike its own pages
    // (/upload, /signin), which are lowercase words. Keep a pasted image type (an animated GIF
    // stays animated); .gifv is imgur's video page for a GIF.
    const match = /^\/([A-Za-z0-9]{5,7})(?:\.(\w+))?$/.exec(path);
    if (match && !/^[a-z]+$/.test(match[1]!)) {
      const type = match[2]?.toLowerCase();
      const extension =
        type === "gifv"
          ? "gif"
          : type && IMAGE_EXTENSION.test(`.${type}`)
            ? type
            : "jpg";
      return {
        url: `https://i.imgur.com/${match[1]}.${extension}`,
        obvious: true,
      };
    }
    return kept();
  }

  if (host === "dropbox.com" && /^\/(s|scl\/fi)\//.test(path)) {
    url.searchParams.delete("dl");
    url.searchParams.set("raw", "1");
    return kept();
  }

  // OneDrive share links (1drv.ms, and onedrive.live.com's share and redirect pages) open a page,
  // so they go through OneDrive's sharing API for the file itself. Its direct, embed and download
  // addresses, and SharePoint (work accounts, which need a sign-in), are kept as they are.
  const isOneDriveShare =
    host === "1drv.ms" ||
    (host === "onedrive.live.com" &&
      (path === "/" || path === "/redir") &&
      (url.searchParams.has("resid") || url.searchParams.has("id")));
  if (isOneDriveShare) {
    return {
      url: `https://api.onedrive.com/v1.0/shares/u!${base64Url(url.toString())}/root/content`,
      obvious: false,
    };
  }

  return kept();
}

/** The address to load a picture link from, or null if it can't be one */
export function imageAddress(link: string): string | null {
  const parsed = parseImageLink(link);
  return "url" in parsed ? parsed.url : null;
}

/**
 * Whether a description in a category that doesn't show pictures looks like a picture link anyway:
 * older shows have pictures in other categories too. Only links that are plainly pictures count:
 * an image file or a Google Drive file, as before. A link to a video or a document stays a link.
 */
export function isImageUrl(text: string): boolean {
  const parsed = parseImageLink(text);
  return "url" in parsed && parsed.obvious;
}

/**
 * Whether a category's nominations are pictures: an image category, or an aggregate that only
 * adds up image categories (its nominations are copies of theirs).
 */
export function showsPictures(category: {
  type: string;
  sourceCategories?: { type: string }[];
}): boolean {
  return (
    category.type === "IMAGE" ||
    (category.type === "AGGREGATE" &&
      !!category.sourceCategories?.length &&
      category.sourceCategories.every(source => source.type === "IMAGE"))
  );
}
