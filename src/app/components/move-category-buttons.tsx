"use client";

import { useEffect, useRef, useTransition } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { useTRPC } from "~/trpc/react";

/**
 * Moves a category one place up or down in the show's running order. After a move the category's
 * card is somewhere else on the page, so it's scrolled back into view, with focus still on the
 * button, ready for the next move.
 */
export function MoveCategoryButtons({
  categoryId,
  categoryName,
  /** Its place in the running order, from 0 */
  index,
  count,
}: {
  categoryId: string;
  categoryName: string;
  index: number;
  count: number;
}) {
  const router = useRouter();
  // Ignores clicks until the refreshed page arrives with the new order
  const [isRefreshing, startRefresh] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  /** The arrow the host just used, until the move has settled */
  const moved = useRef<"up" | "down" | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onManageError = useManageErrorHandler();
  const move = useMutation(
    trpc.award.moveCategory.mutationOptions({
      onSuccess: () => {
        // The add-category form lists the categories as aggregate sources, in this order
        void queryClient.invalidateQueries(
          trpc.award.getSessionCategories.pathFilter(),
        );
        startRefresh(() => router.refresh());
      },
      onError: onManageError("Failed to move category"),
    }),
  );
  const isMoving = move.isPending || isRefreshing;

  // Follow the card to its new place after the host moved it. Reordering the cards can move this
  // one's DOM node, which drops focus, so the arrow gets it back.
  useEffect(() => {
    if (!moved.current) return;
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    ref.current
      ?.querySelector<HTMLElement>(`[data-direction="${moved.current}"]`)
      ?.focus({ preventScroll: true });
  }, [index]);

  // Once the move has settled (moved, failed or changed nothing), forget it
  useEffect(() => {
    if (!isMoving) moved.current = null;
  }, [isMoving]);

  // aria-disabled rather than disabled, so focus stays on the button while it moves
  const moveButton = (direction: "up" | "down") => {
    const atEnd = direction === "up" ? index === 0 : index === count - 1;
    return {
      "aria-disabled": isMoving || atEnd,
      onClick: () => {
        if (isMoving || atEnd) return;
        moved.current = direction;
        move.mutate({ id: categoryId, direction });
      },
    };
  };

  return (
    <div ref={ref} className="flex flex-col">
      {(
        [
          ["up", ChevronUp],
          ["down", ChevronDown],
        ] as const
      ).map(([direction, Icon]) => (
        <Button
          key={direction}
          data-direction={direction}
          variant="ghost"
          size="icon"
          className="h-6 w-8 aria-disabled:cursor-default aria-disabled:opacity-40"
          tooltip={`Move ${direction}`}
          aria-label={`Move ${categoryName} ${direction}`}
          {...moveButton(direction)}
        >
          <Icon className="size-4" />
        </Button>
      ))}
    </div>
  );
}
