import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { optimistic } from "./optimistic";

const queryClient = new QueryClient();
const queryKey = ["votes"];

/** Runs a mutation with the options, settling with `result` */
const run = (
  options: ReturnType<typeof optimistic<string, string[], Error>>,
  result: () => Promise<unknown>,
) =>
  queryClient
    .getMutationCache()
    .build(queryClient, { ...options, mutationFn: result })
    .execute("Dune")
    .catch(() => undefined);

describe("optimistic", () => {
  const onError = vi.fn();
  const options = () =>
    optimistic<string, string[], Error>({
      queryClient,
      queryKey,
      change: (before, nomination) => [...(before ?? []), nomination],
      onError,
    });

  beforeEach(() => {
    queryClient.clear();
    onError.mockClear();
    queryClient.setQueryData(queryKey, ["Barbie"]);
  });

  it("shows the change before the server answers, then fetches what the server has", async () => {
    let answer!: () => void;
    const pending = run(
      options(),
      () => new Promise<void>(resolve => (answer = resolve)),
    );
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(queryKey)).toEqual(["Barbie", "Dune"]),
    );

    answer();
    await pending;

    expect(queryClient.getQueryData(queryKey)).toEqual(["Barbie", "Dune"]);
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
  });

  it("shows the change even before the query has loaded", async () => {
    queryClient.clear();

    await run(options(), () => Promise.resolve());

    expect(queryClient.getQueryData(queryKey)).toEqual(["Dune"]);
  });

  it("puts the data back, fetches it again and says why when the server refuses", async () => {
    const error = new Error("Voting has closed");

    await run(options(), () => Promise.reject(error));

    expect(queryClient.getQueryData(queryKey)).toEqual(["Barbie"]);
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    expect(onError).toHaveBeenCalledWith(error, "Dune");
  });

  it("doesn't bring back a query the page dropped while the server answered", async () => {
    await run(options(), () => {
      queryClient.removeQueries({ queryKey });
      return Promise.reject(new Error("Voting has closed"));
    });

    expect(queryClient.getQueryCache().find({ queryKey })).toBeUndefined();
  });

  it("names the query it changes, so live events hold it", () => {
    expect(options().meta).toEqual({ holds: queryKey });
  });
});
