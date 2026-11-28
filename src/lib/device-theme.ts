import {
  LIGHT_QUERY,
  THEME_STORAGE_KEY as STORAGE_KEY,
} from "~/lib/device-theme-script";
import { setDocumentTheme, type Theme } from "~/lib/theme";

/**
 * The theme of pages on the visitor's own device (the vote page): the device's light or dark
 * setting, unless they've picked one, which is remembered on the device. The big screen doesn't
 * use this: the host sets its theme per show.
 */

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
