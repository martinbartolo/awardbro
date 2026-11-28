"use client";

import { useLayoutEffect } from "react";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { Button } from "~/components/ui/button";
import {
  applyDeviceTheme,
  saveDeviceTheme,
  watchDeviceTheme,
} from "~/lib/device-theme";
import { clearDocumentTheme, useActiveTheme } from "~/lib/theme";

/**
 * Keeps `<html>` on the device's theme while a device page is open (see DeviceTheme), and takes
 * it off when the page closes
 */
export function FollowDeviceTheme() {
  // Before the first paint: arriving from the homepage form (client navigation) runs no inline
  // script, so this is what keeps a light phone from flashing dark
  useLayoutEffect(() => {
    applyDeviceTheme();
    const stop = watchDeviceTheme(applyDeviceTheme);
    return () => {
      stop();
      clearDocumentTheme();
    };
  }, []);
  return null;
}

/**
 * Switches a page on the visitor's own device between light and dark, remembered on the device.
 * Until they pick one, the page follows the device's setting (DeviceTheme keeps it in step).
 */
export function ThemeToggle() {
  // What's on <html>: set before the first paint by DEVICE_THEME_SCRIPT, so no flash
  const theme = useActiveTheme();

  const next = theme === "light" ? "dark" : "light";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground size-9 rounded-full"
      aria-label={`Switch to ${next} theme`}
      tooltip={`Switch to ${next} theme`}
      onClick={() => saveDeviceTheme(next)}
    >
      {next === "light" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
