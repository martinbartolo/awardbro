import { useSyncExternalStore } from "react";

/** The origin never changes while the page is open, so there's nothing to subscribe to */
const subscribe = () => () => undefined;

/**
 * The address this page was opened at, such as "https://awardbro.com", or null while rendering
 * on the server, so links to the app work on every deployment.
 */
export const useOrigin = () =>
  useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => null,
  );
