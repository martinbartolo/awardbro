"use client";

import { createContext, useContext } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { type ManageError } from "~/lib/manage-error";
import { optimistic } from "~/lib/optimistic";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

type Session = RouterOutputs["award"]["getSession"];
type ShowCategory = Session["categories"][number];

/** The room code of the show a host page is about, for its actions */
const ShowCodeContext = createContext<string | null>(null);
export const ShowCodeProvider = ShowCodeContext.Provider;

/** The room code of the show this host page is about (under a `ShowCodeProvider`) */
export function useShowCode() {
  const code = useContext(ShowCodeContext);
  if (!code)
    throw new Error("This needs the show's room code (ShowCodeProvider)");
  return code;
}

/**
 * Options for a host action that changes the show (its `getSession` query) straight away, before
 * the server answers (see optimistic.ts): `change` turns the show's categories into what they'll
 * be. If the server refuses, the show goes back and the host is told why (`fallback`, or the
 * server's message). For host pages, under a `ShowCodeProvider`.
 */
export function useShowChange() {
  const sessionChange = useSessionChange();
  return <TVariables,>(
    change: (
      categories: ShowCategory[],
      variables: TVariables,
    ) => ShowCategory[],
    fallback?: string,
  ) =>
    sessionChange<TVariables>(
      (session, variables) => ({
        ...session,
        categories: change(session.categories, variables),
      }),
      fallback,
    );
}

/** Like `useShowChange`, for an action that changes the show itself rather than its categories */
export function useSessionChange() {
  const code = useShowCode();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onManageError = useManageErrorHandler();

  return <TVariables,>(
    change: (session: Session, variables: TVariables) => Session,
    fallback?: string,
  ) =>
    optimistic<TVariables, Session, ManageError>({
      queryClient,
      queryKey: trpc.award.getSession.queryKey({ code }),
      change: (before, variables) => before && change(before, variables),
      onError: onManageError(fallback),
    });
}
