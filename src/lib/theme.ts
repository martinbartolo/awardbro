import { useSyncExternalStore } from "react";

/**
 * The page's theme lives on `<html>`: light is `data-theme="light"`, and dark, the default, has
 * none. Putting it there (rather than on a page's own root) makes everything follow it, dialogs,
 * tooltips and toasts included, which render outside the page.
 *
 * Two kinds of page set it: the big screen, from the host's choice for the show
 * (`useDocumentTheme`), and the vote page, from the device (`device-theme.ts`). Each takes it off
 * when it closes, so the next page starts from the default.
 */

export type Theme = "light" | "dark";

/** Shows a theme */
export function setDocumentTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;
}

/** Back to the default (dark), as a page that set a theme closes */
export const clearDocumentTheme = () => setDocumentTheme("dark");

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};

/** The theme showing: dark unless a page has set light */
export const useActiveTheme = () =>
  useSyncExternalStore<Theme>(
    subscribe,
    () =>
      document.documentElement.dataset.theme === "light" ? "light" : "dark",
    () => "dark",
  );
