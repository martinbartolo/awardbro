"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

/**
 * Text cut to at most `lines` lines, ending in "…" at a word where it can. CSS line clamping
 * can't do this for centred text: Chrome centres the line before adding its "…", which then
 * runs past the box and is cut off. Here the "…" is part of the text, so it's centred with it.
 * It fits again whenever its box changes size (a column growing at the crown, a resized window).
 * Screen readers get the whole text.
 */
export function FittedText({
  text,
  lines,
  className,
}: {
  text: string;
  lines: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);

  useLayoutEffect(() => {
    const element = ref.current;
    const box = element?.parentElement;
    if (!element || !box) return;

    // Fits again only when the box's width changes (the first ResizeObserver call reports the
    // width it was observed at, so it's skipped too)
    let fittedWidth = -1;
    const fit = () => {
      const width = box.clientWidth;
      if (width === fittedWidth) return;
      fittedWidth = width;

      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      const fits = (shown: string) => {
        element.textContent = shown;
        return element.offsetHeight <= lineHeight * lines + 1;
      };
      if (fits(text)) {
        setShown(text);
        return;
      }
      const ending = (cut: string) => `${cut.replace(/[\s,.;:–-]+$/, "")}…`;

      // The longest start of the text that fits, found by halving (a few layouts, not one per
      // letter)
      let low = 1;
      let high = text.length - 1;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (fits(ending(text.slice(0, middle)))) low = middle;
        else high = middle - 1;
      }
      const byLetters = ending(text.slice(0, low));

      // A cut at a word reads best, unless it throws away much more than the cut mid-word
      // ("The…" where "The leftove…" fits)
      const words = text
        .slice(0, low + 1)
        .split(/\s+/)
        .slice(0, -1);
      const byWords = words.length > 0 ? ending(words.join(" ")) : null;
      const best =
        byWords && byWords.length >= byLetters.length * 0.6
          ? byWords
          : byLetters;
      element.textContent = best;
      setShown(best);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [text, lines]);

  const cut = shown !== text;
  return (
    <>
      {cut && <span className="sr-only">{text}</span>}
      <span
        ref={ref}
        aria-hidden={cut || undefined}
        className={cn("block", className)}
      >
        {shown}
      </span>
    </>
  );
}
