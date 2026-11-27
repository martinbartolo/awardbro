"use client";

import { useMutation } from "@tanstack/react-query";
import { RotateCcw, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmButton } from "~/app/components/confirm-button";
import { Button } from "~/components/ui/button";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { useTRPC } from "~/trpc/react";

/** Removes every vote in a category, after the host confirms */
export function ResetCategoryVotesButton({
  categoryId,
}: {
  categoryId: string;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const resetCategoryVotes = useMutation(
    trpc.award.resetCategoryVotes.mutationOptions({
      onSuccess: () => {
        router.refresh();
        toast.success("Category votes have been reset");
      },
      onError: onManageError("Failed to reset category votes"),
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
  const router = useRouter();
  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const deleteCategory = useMutation(
    trpc.award.deleteCategory.mutationOptions({
      onSuccess: () => {
        router.refresh();
      },
      onError: onManageError("Failed to delete category"),
    }),
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
