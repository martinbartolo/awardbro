/** The cookie that identifies a voter's device. `src/proxy.ts` sets it; votes are tied to it. */
export const DEVICE_ID_COOKIE = "device_id";

/** A cookie's value from a request's Cookie header */
export const getCookie = (headers: Headers, name: string) => {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return undefined;

  for (const pair of cookieHeader.split(";")) {
    const index = pair.indexOf("=");
    if (index === -1) continue;
    if (pair.slice(0, index).trim() === name) {
      // Our cookie values are URL-safe, so the raw value is used as is. Decoding would
      // throw on a malformed value and turn a bad cookie into a 500.
      return pair.slice(index + 1).trim();
    }
  }
  return undefined;
};
