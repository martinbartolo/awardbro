const IMAGE_EXTENSION = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
const DRIVE_FILE_ID = /\/file\/d\/([a-zA-Z0-9_-]+)/;

const isDriveFileLink = (url: string) =>
  url.includes("drive.google.com") && url.includes("/file/d/");

/**
 * Whether a nomination description looks like an image link: a URL ending in an image extension,
 * or a Google Drive file link.
 */
export function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSION.test(url) || isDriveFileLink(url);
}

/**
 * Whether a host may save this as an image nomination: a full URL that looks like an image.
 */
export function isValidImageUrl(url: string): boolean {
  try {
    new URL(url);
  } catch {
    return false;
  }
  return isImageUrl(url);
}

/**
 * The URL to load an image from. Google Drive file links become thumbnail URLs, which can be
 * embedded on other sites. Returns "" for a Drive link without a file ID.
 */
export function getImageUrl(url: string): string {
  if (!isDriveFileLink(url)) return url;

  const fileId = DRIVE_FILE_ID.exec(url)?.[1];
  return fileId
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`
    : "";
}
