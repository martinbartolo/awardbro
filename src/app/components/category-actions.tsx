"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Eye, EyeOff, RotateCcw, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { useTRPC } from "~/trpc/react";

type CategoryActionsProps = {
  categoryId: string;
  hideVoteCounts: boolean;
  winnerOnly: boolean;
};

/**
 * Local copy of a server value that can be changed optimistically, and that
 * follows the server value whenever it changes (e.g. after router.refresh()).
 * Adjusting state during render avoids the extra render of an effect.
 */
function useOptimisticFlag(serverValue: boolean) {
  const [value, setValue] = useState(serverValue);
  const [prevServerValue, setPrevServerValue] = useState(serverValue);
  if (prevServerValue !== serverValue) {
    setPrevServerValue(serverValue);
    setValue(serverValue);
  }
  return [value, setValue] as const;
}

export function CategoryActions({
  categoryId,
  hideVoteCounts,
  winnerOnly,
}: CategoryActionsProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onManageError = useManageErrorHandler();

  // Optimistic local state for instant UI feedback
  const [optimisticValue, setOptimisticValue] =
    useOptimisticFlag(hideVoteCounts);
  const [optimisticWinnerOnly, setOptimisticWinnerOnly] =
    useOptimisticFlag(winnerOnly);

  const toggleHideVoteCounts = useMutation(
    trpc.award.toggleHideVoteCounts.mutationOptions({
      onMutate: () => {
        // Optimistically update local state
        setOptimisticValue(prev => !prev);
      },
      onSuccess: data => {
        // Sync with server response
        setOptimisticValue(data.hideVoteCounts);
        // Invalidate to update presentation view live
        void queryClient.invalidateQueries(
          trpc.award.getSessionBySlug.pathFilter(),
        );
        router.refresh();
        toast.success(
          data.hideVoteCounts
            ? "Vote counts will be hidden in presentation"
            : "Vote counts will be visible in presentation",
        );
      },
      onError: error => {
        // Revert optimistic update
        setOptimisticValue(hideVoteCounts);
        onManageError("Failed to update setting")(error);
      },
    }),
  );

  const toggleWinnerOnly = useMutation(
    trpc.award.toggleWinnerOnly.mutationOptions({
      onMutate: () => {
        setOptimisticWinnerOnly(prev => !prev);
      },
      onSuccess: data => {
        setOptimisticWinnerOnly(data.winnerOnly);
        void queryClient.invalidateQueries(
          trpc.award.getSessionBySlug.pathFilter(),
        );
        router.refresh();
        toast.success(
          data.winnerOnly
            ? "Only winner will be shown on reveal"
            : "All nominees will be shown on reveal",
        );
      },
      onError: error => {
        setOptimisticWinnerOnly(winnerOnly);
        onManageError("Failed to update setting")(error);
      },
    }),
  );

  const deleteCategory = useMutation(
    trpc.award.deleteCategory.mutationOptions({
      onSuccess: () => {
        router.refresh();
      },
      onError: onManageError("Failed to delete category"),
    }),
  );

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
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="iconSm"
        tooltip={optimisticValue ? "Show vote counts" : "Hide vote counts"}
        aria-label={optimisticValue ? "Show vote counts" : "Hide vote counts"}
        onClick={() => toggleHideVoteCounts.mutate({ categoryId })}
        disabled={toggleHideVoteCounts.isPending}
      >
        {optimisticValue ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="iconSm"
        tooltip={
          optimisticWinnerOnly ? "Show all nominees" : "Show winner only"
        }
        aria-label={
          optimisticWinnerOnly ? "Show all nominees" : "Show winner only"
        }
        onClick={() => toggleWinnerOnly.mutate({ categoryId })}
        disabled={toggleWinnerOnly.isPending}
      >
        <Crown
          className={`size-4 ${optimisticWinnerOnly ? "text-yellow-500" : ""}`}
        />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="iconSm"
            tooltip="Reset category votes"
            aria-label="Reset category votes"
          >
            <RotateCcw className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset category votes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all votes from this category. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetCategoryVotes.mutate({ categoryId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Votes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="iconSm"
            tooltip="Delete category"
            aria-label="Delete category"
          >
            <Trash className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and all its
              nominations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCategory.mutate({ id: categoryId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
