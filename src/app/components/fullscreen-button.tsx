"use client";

import { useEffect, useState } from "react";

import { ArrowsInIcon, ArrowsOutIcon } from "@phosphor-icons/react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** How long the pointer rests before the button and the cursor leave the screen */
const IDLE_MS = 2500;

/**
 * Fullscreen in one click (or the F key). On a big screen nobody should see controls, so the
 * button, and the cursor, show only while the pointer moves, or while the button has focus.
 */
export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [active, setActive] = useState(true);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Refused, such as in a frame that doesn't allow it: the page stays as it is
    }
  };

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onPointerMove = () => {
      setActive(true);
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), IDLE_MS);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "f" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        void toggleFullscreen();
      }
    };
    onPointerMove();
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // The cursor goes with the button
  useEffect(() => {
    document.documentElement.classList.toggle("cursor-none", !active);
    return () => document.documentElement.classList.remove("cursor-none");
  }, [active]);

  const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
  return (
    <Button
      onClick={toggleFullscreen}
      variant="secondary"
      size="icon"
      className={cn(
        "fixed right-6 bottom-6 z-50 transition-opacity duration-300 focus-visible:opacity-100",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      tooltip={`${label} (F)`}
      aria-label={label}
    >
      {isFullscreen ? <ArrowsInIcon /> : <ArrowsOutIcon />}
    </Button>
  );
}
