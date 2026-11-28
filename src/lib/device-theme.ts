import { setDocumentTheme, type Theme } from "~/lib/theme";

/**
 * The theme of pages on the visitor's own device (the vote page): the device's light or dark
 * setting, unless they've picked one, which is remembered on the device. The big screen doesn't
 * use this: the host sets its theme per show.
 */

const STORAGE_KEY = "awardbro-theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

/**
 * Sets the theme before the page first paints, so a light phone never flashes dark. An inline
 * script in the page's HTML; its text is fixed, nothing in it comes from a visitor.
 */
export const DEVICE_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("${LIGHT_QUERY}").matches?"light":"dark";if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}})()`;

/** The theme the visitor picked on this device, if any */
function savedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    // Storage blocked (private mode in some browsers): follow the device
    return null;
  }
}

/** The theme to show: the one picked on this device, else the device's setting */
const deviceTheme = (): Theme =>
  savedTheme() ?? (matchMedia(LIGHT_QUERY).matches ? "light" : "dark");

/** Puts the device's theme on `<html>` */
export const applyDeviceTheme = () => setDocumentTheme(deviceTheme());

/** Remembers the visitor's pick on this device, and shows it */
export function saveDeviceTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not remembered, but still shown until the page closes
  }
  setDocumentTheme(theme);
}

/**
 * Calls `onChange` when the device's setting changes (the phone switching to dark at sunset)
 * or another tab picks a theme. Returns a function that stops it.
 */
export function watchDeviceTheme(onChange: () => void) {
  const query = matchMedia(LIGHT_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  query.addEventListener("change", onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}
