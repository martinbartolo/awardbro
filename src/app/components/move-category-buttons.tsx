"use client";

import { useEffect, useRef } from "react";

import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { useShowChange } from "~/lib/hooks/useShowChange";
import { moveInOrder } from "~/lib/show-changes";
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
  const ref = useRef<HTMLDivElement>(null);
  /** The arrow the host just used, until the move has settled */
  const moved = useRef<"up" | "down" | null>(null);

  const trpc = useTRPC();
  const showChange = useShowChange();
  // Moves straight away; further clicks wait until the server has the new order
  const move = useMutation(
    trpc.award.moveCategory.mutationOptions(
      showChange(
        (
          categories,
          { id, direction }: { id: string; direction: "up" | "down" },
        ) => moveInOrder(categories, id, direction),
        "Failed to move category",
      ),
    ),
  );
  const isMoving = move.isPending;

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
          ["up", CaretUpIcon],
          ["down", CaretDownIcon],
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
          <Icon />
        </Button>
      ))}
    </div>
  );
}
