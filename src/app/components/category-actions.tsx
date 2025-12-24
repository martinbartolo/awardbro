"use client";

import { useEffect, useState } from "react";

import { Crown, Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
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
import { api } from "~/trpc/react";

type CategoryActionsProps = {
  categoryId: string;
  hideVoteCounts: boolean;
  winnerOnly: boolean;
};

export function CategoryActions({
  categoryId,
  hideVoteCounts,
  winnerOnly,
}: CategoryActionsProps) {
  const router = useRouter();
  const utils = api.useUtils();

  // Optimistic local state for instant UI feedback
  const [optimisticValue, setOptimisticValue] = useState(hideVoteCounts);
  const [optimisticWinnerOnly, setOptimisticWinnerOnly] = useState(winnerOnly);

  // Sync optimistic state when prop changes (e.g., after server refresh)
  useEffect(() => {
    setOptimisticValue(hideVoteCounts);
  }, [hideVoteCounts]);

  useEffect(() => {
    setOptimisticWinnerOnly(winnerOnly);
  }, [winnerOnly]);

  const toggleHideVoteCounts = api.award.toggleHideVoteCounts.useMutation({
    onMutate: () => {
      // Optimistically update local state
      setOptimisticValue(prev => !prev);
    },
    onSuccess: data => {
      // Sync with server response
      setOptimisticValue(data.hideVoteCounts);
      // Invalidate to update presentation view live
      void utils.award.getSessionBySlug.invalidate();
      router.refresh();
      toast.success(
        data.hideVoteCounts
          ? "Vote counts will be hidden in presentation"
          : "Vote counts will be visible in presentation",
      );
    },
    onError: () => {
      // Revert optimistic update
      setOptimisticValue(hideVoteCounts);
      toast.error("Failed to update setting");
    },
  });

  const toggleWinnerOnly = api.award.toggleWinnerOnly.useMutation({
    onMutate: () => {
      setOptimisticWinnerOnly(prev => !prev);
    },
    onSuccess: data => {
      setOptimisticWinnerOnly(data.winnerOnly);
      void utils.award.getSessionBySlug.invalidate();
      router.refresh();
      toast.success(
        data.winnerOnly
          ? "Only winner will be shown on reveal"
          : "All nominees will be shown on reveal",
      );
    },
    onError: () => {
      setOptimisticWinnerOnly(winnerOnly);
      toast.error("Failed to update setting");
    },
  });

  const deleteCategory = api.award.deleteCategory.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to delete category");
    },
  });

  const resetCategoryVotes = api.award.resetCategoryVotes.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("Category votes have been reset");
    },
    onError: () => {
      toast.error("Failed to reset category votes");
    },
  });

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
            <Trash2 className="size-4" />
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
