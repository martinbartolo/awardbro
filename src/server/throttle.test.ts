import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createThrottle } from "./throttle";

describe("createThrottle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs the first call straight away", () => {
    const throttle = createThrottle(500);
    const fn = vi.fn();

    throttle.run("a", fn);

    expect(fn).toHaveBeenCalledOnce();
  });

  it("folds a burst into one more run at the end of the period", () => {
    const throttle = createThrottle(500);
    const calls: number[] = [];

    for (let i = 0; i < 100; i++) throttle.run("a", () => calls.push(i));
    expect(calls).toEqual([0]);

    vi.advanceTimersByTime(500);
    // The last call of the burst, so the latest change isn't left out
    expect(calls).toEqual([0, 99]);
  });

  it("runs at most once per period during a long stream of calls", () => {
    const throttle = createThrottle(500);
    const fn = vi.fn();

    // A call every 10 ms for 2 seconds
    for (let t = 0; t < 2000; t += 10) {
      throttle.run("a", fn);
      vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(1000);

    // Straight away, then once at the end of each of the 4 periods
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it("doesn't run again after a period with no calls", () => {
    const throttle = createThrottle(500);
    const fn = vi.fn();

    throttle.run("a", fn);
    vi.advanceTimersByTime(2000);

    expect(fn).toHaveBeenCalledOnce();
    // The next call after a quiet period runs straight away
    throttle.run("a", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("keeps keys apart", () => {
    const throttle = createThrottle(500);
    const a = vi.fn();
    const b = vi.fn();

    throttle.run("a", a);
    throttle.run("b", b);
    throttle.run("a", a);

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(500);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledOnce();
  });

  it("drops pending runs when cleared", () => {
    const throttle = createThrottle(500);
    const fn = vi.fn();

    throttle.run("a", fn);
    throttle.run("a", fn);
    throttle.clear();
    vi.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledOnce();
  });
});
