/**
 * Runs something at most once per `ms` for each key. The first call runs straight away. Calls
 * during the next `ms` are folded into one more run at the end of it, so the last change is never
 * left out. Used to turn a burst of votes into a few events, since pages only fetch again.
 */
export function createThrottle(ms: number) {
  /** Keys in a quiet period, and whether a call came in during it */
  const windows = new Map<
    string,
    { pending: (() => void) | null; timer: ReturnType<typeof setTimeout> }
  >();

  const open = (key: string) => {
    const timer = setTimeout(() => {
      const window = windows.get(key);
      windows.delete(key);
      if (window?.pending) {
        window.pending();
        open(key);
      }
    }, ms);
    windows.set(key, { pending: null, timer });
  };

  return {
    run(key: string, fn: () => void) {
      const window = windows.get(key);
      if (window) {
        window.pending = fn;
        return;
      }
      fn();
      open(key);
    },
    /** Drops every pending run */
    clear() {
      for (const window of windows.values()) clearTimeout(window.timer);
      windows.clear();
    },
  };
}
