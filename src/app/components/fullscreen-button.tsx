"use client";

import { useEffect, useState } from "react";

import { ArrowsInIcon, ArrowsOutIcon } from "@phosphor-icons/react";

import { Button } from "~/components/ui/button";

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
    }
  };

  return (
    <Button
      onClick={toggleFullscreen}
      variant="ghost"
      size="icon"
      className="fixed top-4 right-4 z-50"
      tooltip={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ? <ArrowsInIcon /> : <ArrowsOutIcon />}
    </Button>
  );
}
