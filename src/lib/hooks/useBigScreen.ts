"use client";

import { useEffect } from "react";

import { clearDocumentTheme, setDocumentTheme, type Theme } from "~/lib/theme";

/**
 * Keeps the screen awake while the page is open (Screen Wake Lock), so the big screen doesn't
 * dim or lock mid-show. The browser drops the lock when the tab is hidden, so it's asked for
 * again when the tab is shown. Where it isn't supported, nothing happens.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    // One request at a time, so a quick hide and show can't take a second lock
    let requesting = false;
    let stopped = false;

    const request = async () => {
      if (document.visibilityState !== "visible" || lock || requesting) return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) {
          await next.release();
          return;
        }
        lock = next;
        next.addEventListener("release", () => {
          if (lock === next) lock = null;
        });
      } catch {
        // Refused (battery saver, or no user gesture yet): the screen may dim, nothing more
      } finally {
        requesting = false;
      }
    };

    const onVisibilityChange = () => void request();
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void lock?.release();
    };
  }, []);
}

/** Puts a page's theme on `<html>` while it's open (see `~/lib/theme`) */
export function useDocumentTheme(theme: Theme) {
  useEffect(() => {
    setDocumentTheme(theme);
    return clearDocumentTheme;
  }, [theme]);
}
