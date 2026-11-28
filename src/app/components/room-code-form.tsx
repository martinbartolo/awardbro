"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  CheckSquareOffsetIcon,
  CircleNotchIcon,
  GearIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { type AppRouter } from "~/server/api/root";
import { useTRPC } from "~/trpc/react";

const pages = {
  vote: { label: "Join", icon: CheckSquareOffsetIcon },
  manage: { label: "Manage", icon: GearIcon },
};

/**
 * Someone enters a show's room code and goes to its vote page (voters, with the code from the big
 * screen) or its manage page (hosts, who find their show by its code).
 */
export function RoomCodeForm({
  page,
  label,
  focusOnMount = false,
}: {
  page: "vote" | "manage";
  /** Read out by screen readers; the form shows only the placeholder */
  label: string;
  /** For a form that appears when asked for, so keyboard and screen reader users land in it */
  focusOnMount?: boolean;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);
  const [code, setCode] = useState("");
  const [isOpening, startOpening] = useTransition();
  const { label: buttonLabel, icon: Icon } = pages[page];

  const findShow = useMutation({
    mutationFn: (code: string) =>
      queryClient.fetchQuery(
        trpc.award.findShow.queryOptions({ code }, { retry: false }),
      ),
    onSuccess: show => startOpening(() => router.push(`/${page}/${show.code}`)),
  });
  // Also while the page opens, so the button can't be pressed twice
  const isBusy = findShow.isPending || isOpening;
  const canSubmit = code.trim() !== "" && !isBusy;
  // "No show has that code"; anything else (a network error, or input the server refused) gets a
  // general message instead of the raw error
  const notFound =
    findShow.error instanceof TRPCClientError &&
    (findShow.error as TRPCClientError<AppRouter>).data?.code === "NOT_FOUND";
  const error = !findShow.error
    ? null
    : notFound
      ? findShow.error.message
      : "Couldn't look up that show. Please try again.";
  const errorId = `${id}-error`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) findShow.mutate(code);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={id}
          value={code}
          onChange={e => {
            setCode(e.target.value);
            // Not while looking up, which would let the old lookup open its show later
            if (!isBusy) findShow.reset();
          }}
          placeholder="Room code, e.g. K7QF"
          maxLength={200}
          className="h-12 flex-1 font-mono text-lg tracking-wide uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        />
        <Button
          type="submit"
          disabled={!canSubmit}
          variant={page === "vote" ? "default" : "outline"}
          className="h-12 px-6"
        >
          {isBusy ? <CircleNotchIcon className="animate-spin" /> : <Icon />}
          {buttonLabel}
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
