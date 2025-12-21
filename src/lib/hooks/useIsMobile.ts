import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

export const useIsMobile = () => {
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const listener = () => callback();
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  };

  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  };

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
