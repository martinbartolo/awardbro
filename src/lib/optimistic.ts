import { type QueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Options for a mutation that shows its result straight away, before the server answers: it
 * changes one cached query (`queryKey`) as the server will. If the server refuses, it puts the
 * query back. Either way, once the server has answered it fetches the query again, so the page
 * ends up showing what the server has (and anything derived from it that `change` didn't
 * update), even if something fetched the query while the mutation was on its way.
 *
 * `meta.holds` names the query, so live events don't fetch it while the mutation is on its way
 * and undo what the page already shows (see connectShowEvents).
 */
export function optimistic<TVariables, TData, TError>({
  queryClient,
  queryKey,
  change,
  onError,
}: {
  queryClient: QueryClient;
  queryKey: QueryKey;
  /** The query's data as it will be once the server has done this (undefined: leave it) */
  change: (
    before: TData | undefined,
    variables: TVariables,
  ) => TData | undefined;
  /** Tells the person what went wrong, after the query has been put back */
  onError: (error: TError, variables: TVariables) => void;
}) {
  const exists = () =>
    !!queryClient.getQueryCache().find({ queryKey, exact: true });

  return {
    meta: { holds: queryKey },
    onMutate: async (variables: TVariables) => {
      // A fetch already on its way may bring back the data from before this
      await queryClient.cancelQueries({ queryKey, exact: true });
      const before = queryClient.getQueryData<TData>(queryKey);
      queryClient.setQueryData(queryKey, change(before, variables));
      return { before };
    },
    onError: (
      error: TError,
      variables: TVariables,
      context: { before: TData | undefined } | undefined,
    ) => {
      // Unless the page has moved on and dropped the query meanwhile
      if (exists()) queryClient.setQueryData(queryKey, context?.before);
      onError(error, variables);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey, exact: true }),
  };
}
