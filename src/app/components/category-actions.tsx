"use client";

import { RotateCcw, Trash2 } from "lucide-react";
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
};

export function CategoryActions({ categoryId }: CategoryActionsProps) {
  const router = useRouter();

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
