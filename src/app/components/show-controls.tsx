"use client";

import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  type Icon,
  MoonIcon,
  SunIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmButton } from "~/app/components/confirm-button";
import { Button } from "~/components/ui/button";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { useSessionChange, useShowChange } from "~/lib/hooks/useShowChange";
import { showPaths } from "~/lib/join";
import { withoutVotes } from "~/lib/show-changes";
import { cn } from "~/lib/utils";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

type ScreenTheme = RouterOutputs["award"]["getSession"]["screenTheme"];

const SCREEN_THEMES: { theme: ScreenTheme; label: string; icon: Icon }[] = [
  { theme: "NIGHT", label: "Night", icon: MoonIcon },
  { theme: "PAPER", label: "Paper", icon: SunIcon },
];

/** What the host needs to get the show going: the room code voters enter, and the big screen */
export function RunShowCard({
  code,
  sessionId,
  screenTheme,
}: {
  code: string;
  sessionId: string;
  screenTheme: ScreenTheme;
}) {
  const trpc = useTRPC();
  // The big screen follows straight away, on any device it's open on
  const sessionChange = useSessionChange();
  const setScreenTheme = useMutation(
    trpc.award.setScreenTheme.mutationOptions(
      sessionChange(
        (session, { theme }: { theme: ScreenTheme }) => ({
          ...session,
          screenTheme: theme,
        }),
        "Failed to change the big screen's theme",
      ),
    ),
  );

  return (
    <section
      aria-labelledby="run-show"
      className="bg-card shadow-soft rounded-panel mb-10 flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7"
    >
      <div>
        <h2 id="run-show" className="text-muted-foreground text-sm font-medium">
          Room code
        </h2>
        <p className="text-5xl leading-none font-bold tracking-[0.06em]">
          {code}
        </p>
        <p className="text-muted-foreground mt-3 max-w-xs text-sm">
          Voters scan the QR code on the big screen, or enter this code on the
          homepage.
        </p>
      </div>
      {/* The big screen in a new tab; the run view here, or on the host's phone */}
      <div className="flex shrink-0 flex-col gap-3">
        <div
          role="radiogroup"
          aria-labelledby="screen-theme"
          className="flex items-center gap-3 sm:justify-end"
        >
          <span id="screen-theme" className="text-muted-foreground text-sm">
            Big screen
          </span>
          <div className="bg-background flex rounded-full p-1">
            {SCREEN_THEMES.map(({ theme, label, icon: ThemeIcon }) => {
              const checked = screenTheme === theme;
              return (
                <Button
                  key={theme}
                  size="sm"
                  variant={checked ? "secondary" : "ghost"}
                  role="radio"
                  aria-checked={checked}
                  onClick={() =>
                    !checked && setScreenTheme.mutate({ sessionId, theme })
                  }
                  className={cn(
                    "rounded-full",
                    !checked && "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ThemeIcon />
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="pill" variant="quiet">
            <Link href={showPaths.present(code)} target="_blank">
              Open Big Screen
              <ArrowSquareOutIcon />
            </Link>
          </Button>
          <Button asChild size="pill" className="group shadow-soft">
            <Link href={showPaths.run(code)}>
              Run the Show
              <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/** A dangerous action at rest: quiet, red only on hover (the confirm dialog's button is the solid one) */
const QUIET_DANGER =
  "rounded-full hover:border-destructive hover:text-destructive";

/** Resetting every vote and deleting the show, kept apart from the everyday controls */
export function DangerZone({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const deleteSession = useMutation(
    trpc.award.deleteSession.mutationOptions({
      onSuccess: () => {
        router.push("/");
        toast.success("Award show deleted successfully");
      },
      onError: onManageError("Failed to delete award show"),
    }),
  );

  // Every score goes to 0 straight away
  const showChange = useShowChange();
  const resetAllVotes = useMutation(
    trpc.award.resetAllVotes.mutationOptions({
      ...showChange(
        categories => categories.map(withoutVotes),
        "Failed to reset votes",
      ),
      onSuccess: () => {
        toast.success("All votes have been reset");
      },
    }),
  );

  return (
    <section
      aria-labelledby="danger-zone"
      className="border-destructive/40 rounded-panel border-2 p-6 sm:p-7"
    >
      <h2
        id="danger-zone"
        className="text-foreground mb-1 text-xl font-semibold"
      >
        Danger zone
      </h2>
      <p className="text-muted-foreground mb-4 text-sm">
        These can&apos;t be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <ConfirmButton
          title="Reset all votes?"
          description="This will remove all votes from all categories. This action cannot be undone."
          confirmLabel="Reset All Votes"
          onConfirm={() => resetAllVotes.mutate({ sessionId })}
        >
          <Button variant="quiet" className={QUIET_DANGER}>
            <ArrowCounterClockwiseIcon />
            Reset All Votes
          </Button>
        </ConfirmButton>

        <ConfirmButton
          title="Delete award show?"
          description="This will permanently delete your award show and all its data. This action cannot be undone."
          confirmLabel="Delete Show"
          onConfirm={() => deleteSession.mutate({ id: sessionId })}
        >
          <Button variant="quiet" className={QUIET_DANGER}>
            <TrashIcon />
            Delete Award Show
          </Button>
        </ConfirmButton>
      </div>
    </section>
  );
}
