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

    const fit = () => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      const tooTall = () => element.offsetHeight > lineHeight * lines + 1;
      element.textContent = text;
      if (!tooTall()) {
        setShown(text);
        return;
      }
      const ending = (cut: string) => `${cut.replace(/[\s,.;:–-]+$/, "")}…`;
      /** The longest start of the text that fits, cut letter by letter */
      const byLetters = () => {
        let letters = text;
        do {
          letters = letters.slice(0, -1);
          element.textContent = ending(letters);
        } while (letters.length > 1 && tooTall());
        return element.textContent;
      };
      /** The same, cut at a word (null when even the first word is too long) */
      const byWords = () => {
        let words = text.split(/\s+/);
        do {
          words = words.slice(0, -1);
          element.textContent = ending(words.join(" "));
        } while (words.length > 1 && tooTall());
        return words.length > 0 && !tooTall() ? element.textContent : null;
      };
      // A cut at a word reads best, unless it throws away much more than a cut mid-word would
      // ("The…" where "The leftove…" fits)
      const letters = byLetters();
      const words = byWords();
      const best =
        words && words.length >= letters.length * 0.6 ? words : letters;
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
