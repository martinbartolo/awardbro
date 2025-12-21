"use client";

import { useEffect, useState } from "react";

import { Maximize2, Minimize2 } from "lucide-react";

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
    >
      {isFullscreen ? <Minimize2 /> : <Maximize2 />}
    </Button>
  );
}
