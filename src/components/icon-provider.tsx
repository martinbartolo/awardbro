"use client";

import { IconContext } from "@phosphor-icons/react";

/**
 * Icons are Bold by default, to match Fredoka's heavy strokes; a few moments ask for Duotone. The
 * value replaces Phosphor's default context, so it keeps its 1em size. Icons are hidden from screen
 * readers, as they never are the only label: the text next to them, or the button's aria-label,
 * says what they mean.
 */
const icons = { weight: "bold", size: "1em", "aria-hidden": true } as const;

export function IconProvider({ children }: { children: React.ReactNode }) {
  return <IconContext.Provider value={icons}>{children}</IconContext.Provider>;
}
