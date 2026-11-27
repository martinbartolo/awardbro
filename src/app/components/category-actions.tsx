"use client";

import { useMutation } from "@tanstack/react-query";
import { RotateCcw, Trash } from "lucide-react";
import { toast } from "sonner";

import { ConfirmButton } from "~/app/components/confirm-button";
import { Button } from "~/components/ui/button";
import { useShowChange } from "~/lib/hooks/useShowChange";
import {
  updateCategory,
  withoutCategory,
  withoutVotes,
} from "~/lib/show-changes";
import { useTRPC } from "~/trpc/react";

/** Removes every vote in a category, after the host confirms */
export function ResetCategoryVotesButton({
  categoryId,
}: {
  categoryId: string;
}) {
  const trpc = useTRPC();
  const showChange = useShowChange();
  // Its scores go to 0 straight away (an aggregate's follow once the server has answered)
  const resetCategoryVotes = useMutation(
    trpc.award.resetCategoryVotes.mutationOptions({
      ...showChange(
        (categories, { categoryId: id }: { categoryId: string }) =>
          updateCategory(categories, id, withoutVotes),
        "Failed to reset category votes",
      ),
      onSuccess: () => {
        toast.success("Category votes have been reset");
      },
    }),
  );

  return (
    <ConfirmButton
      title="Reset category votes?"
      description="This will remove all votes from this category. This action cannot be undone."
      confirmLabel="Reset Votes"
      onConfirm={() => resetCategoryVotes.mutate({ categoryId })}
    >
      <Button
        variant="ghost"
        size="iconSm"
        tooltip="Reset category votes"
        aria-label="Reset category votes"
      >
        <RotateCcw className="size-4" />
      </Button>
    </ConfirmButton>
  );
}

/** Deletes a category with its nominations and votes, after the host confirms */
export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const trpc = useTRPC();
  const showChange = useShowChange();
  // Gone straight away, from its aggregates' sources too (their copies follow once the server
  // has answered)
  const deleteCategory = useMutation(
    trpc.award.deleteCategory.mutationOptions(
      showChange(
        (categories, { id }: { id: string }) => withoutCategory(categories, id),
        "Failed to delete category",
      ),
    ),
  );

  return (
    <ConfirmButton
      title="Delete category?"
      description="This will permanently delete this category and all its nominations. This action cannot be undone."
      confirmLabel="Delete Category"
      onConfirm={() => deleteCategory.mutate({ id: categoryId })}
    >
      <Button
        variant="ghost"
        size="iconSm"
        tooltip="Delete category"
        aria-label="Delete category"
      >
        <Trash className="size-4" />
      </Button>
    </ConfirmButton>
  );
}
