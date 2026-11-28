"use client";

import { useEffect } from "react";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { Button } from "~/components/ui/button";
import {
  applyDeviceTheme,
  deviceTheme,
  saveDeviceTheme,
  watchDeviceTheme,
} from "~/lib/device-theme";
import { useActiveTheme } from "~/lib/hooks/useBigScreen";

/**
 * Switches a page on the visitor's own device between light and dark, remembered on the device.
 * Until they pick one, the page follows the device's setting. Mount it once per page: it keeps
 * `<html>` in step while the page is open, and takes the theme off when the page closes.
 */
export function ThemeToggle() {
  // What's on <html>: set before the first paint by DEVICE_THEME_SCRIPT, so no flash
  const theme = useActiveTheme();

  useEffect(() => {
    applyDeviceTheme();
    const stop = watchDeviceTheme(applyDeviceTheme);
    return () => {
      stop();
      delete document.documentElement.dataset.theme;
    };
  }, []);

  const next = theme === "light" ? "dark" : "light";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground size-9 rounded-full"
      aria-label={`Switch to ${next} theme`}
      onClick={() =>
        saveDeviceTheme(deviceTheme() === "light" ? "dark" : "light")
      }
    >
      {next === "light" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
