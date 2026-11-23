"use client";

import { useTransition } from "react";

import { Ban, Presentation } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export function SetActiveCategoryButton({
  categoryId,
  isActive,
}: {
  categoryId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  // Keeps the button in "Updating..." until the refreshed page arrives, so it
  // never briefly shows the old label
  const [isRefreshing, startRefresh] = useTransition();

  const setActive = api.award.setActiveCategory.useMutation({
    onSuccess: () => {
      startRefresh(() => router.refresh());
    },
    onError: error => {
      toast.error(error.message || "Error updating category status");
    },
  });
  const isUpdating = setActive.isPending || isRefreshing;

  return (
    <Button
      onClick={() => setActive.mutate({ categoryId, active: !isActive })}
      disabled={isUpdating}
      variant={isActive ? "destructive" : "outline"}
      size="sm"
      className="group"
    >
      {isUpdating ? "Updating..." : isActive ? "Stop Presenting" : "Present"}
      {isActive ? (
        <Ban className="size-4 transition-transform duration-200 group-hover:scale-110" />
      ) : (
        <Presentation className="size-4 transition-transform duration-200 group-hover:scale-110" />
      )}
    </Button>
  );
}
