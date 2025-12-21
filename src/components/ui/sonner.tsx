"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useIsMobile } from "~/lib/hooks/useIsMobile";

const Toaster = ({ ...props }: ToasterProps) => {
  const isMobile = useIsMobile();

  return (
    <Sonner
      position={isMobile ? "top-center" : "top-right"}
      offset={16}
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      swipeDirections={isMobile ? ["right"] : []}
      {...props}
    />
  );
};

export { Toaster };
