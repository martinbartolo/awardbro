"use client";

import { useEffect, useRef, useState } from "react";

import { ImageOff } from "lucide-react";

import { isImageUrl, parseImageLink } from "~/lib/images";
import { cn } from "~/lib/utils";

/**
 * A nomination's description: its picture in an image category, otherwise its text. In other
 * categories a description that looks like a picture link is shown as a picture too, as older
 * shows (and aggregates of image categories) have them.
 *
 * A picture that doesn't load (deleted after the show was set up, say) shows a placeholder, so the
 * nomination's name next to it still makes sense.
 */
export function NominationDescription({
  description,
  isImage = false,
  thumbnail = false,
  className = "",
  imageClassName = "relative mt-2 h-72 sm:h-80 md:h-96 lg:h-112",
}: {
  description: string | null;
  /** Whether it's in an image category, where the description is always a picture link */
  isImage?: boolean;
  /** Whether the picture is a small thumbnail, which needs a smaller placeholder */
  thumbnail?: boolean;
  /** Classes for the text */
  className?: string;
  /** Classes for the picture's box, such as its height */
  imageClassName?: string;
}) {
  if (!description) return null;

  if (!isImage && !isImageUrl(description)) {
    return <div className={className}>{description}</div>;
  }

  const parsed = parseImageLink(description);
  return (
    <Picture
      src={"url" in parsed ? parsed.url : null}
      thumbnail={thumbnail}
      boxClassName={imageClassName}
    />
  );
}

function Picture({
  src,
  thumbnail,
  boxClassName,
}: {
  src: string | null;
  thumbnail: boolean;
  boxClassName: string;
}) {
  // Keyed by address, so a changed link gets another try
  const [failed, setFailed] = useState<string | null>(null);
  const ref = useRef<HTMLImageElement>(null);

  // A server-rendered picture can fail before the page is interactive, when onError isn't
  // listening yet. A finished one that can't be decoded failed. (Its size can't tell: an SVG
  // without one is 0 wide when it loads fine.)
  useEffect(() => {
    const img = ref.current;
    if (src && img?.complete) {
      img.decode().catch(() => {
        if (ref.current === img && !img.naturalWidth) setFailed(src);
      });
    }
  }, [src]);

  if (!src || failed === src) {
    return (
      <div
        role="img"
        aria-label="Picture unavailable"
        className={cn(
          "bg-muted/40 text-muted-foreground flex items-center justify-center rounded-md",
          thumbnail
            ? // The thumbnail's own box, so it lines up where a loaded one would be
              cn("h-10 w-16", boxClassName)
            : "mt-2 h-24 w-36 flex-col gap-1 p-2 text-xs",
        )}
      >
        <ImageOff className="size-5 shrink-0" />
        {!thumbnail && <span>Picture unavailable</span>}
      </div>
    );
  }

  // A plain img for pictures hosted elsewhere: the visitor's browser loads them, never our server
  return (
    <div
      className={cn("flex w-full items-center justify-center", boxClassName)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt=""
        className="max-h-full max-w-full rounded-md object-contain"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
      />
    </div>
  );
}
