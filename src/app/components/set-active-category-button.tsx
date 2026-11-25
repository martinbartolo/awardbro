"use client";

import { useTransition } from "react";

import { useMutation } from "@tanstack/react-query";
import { Ban, Presentation } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { useTRPC } from "~/trpc/react";

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

  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const setActive = useMutation(
    trpc.award.setActiveCategory.mutationOptions({
      onSuccess: () => {
        startRefresh(() => router.refresh());
      },
      onError: onManageError(),
    }),
  );
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
