"use client";

import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useShowEvents } from "~/lib/hooks/useShowEvents";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

type Session = RouterOutputs["award"]["getSession"];

/**
 * The show as a host page (the manage page, the run view) has it: rendered on the server, then
 * kept up to date from its live events (`liveCounts` for a page with live vote counts). If the
 * host loses access meanwhile (their manage cookie expires), the show comes back with only public
 * scores, so the page reloads, which shows the password form.
 */
export function useHostShow(
  code: string,
  initialSession: Session,
  { liveCounts }: { liveCounts: boolean },
) {
  const trpc = useTRPC();
  const router = useRouter();
  useShowEvents(code, { liveCounts });
  const { data: session } = useQuery(
    trpc.award.getSession.queryOptions(
      { code },
      { initialData: initialSession },
    ),
  );

  const lostAccess = !session.canManage;
  useEffect(() => {
    if (lostAccess) router.refresh();
  }, [lostAccess, router]);

  return session;
}
