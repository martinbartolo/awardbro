'use client';

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SetActiveCategoryButton({
  categoryId,
  isActive,
}: {
  categoryId: string;
  isActive: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const setActive = api.award.setActiveCategory.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: () => {
      toast.error("Error updating category status");
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  return (
    <Button
      onClick={() => {
        setIsUpdating(true);
        setActive.mutate({ categoryId });
      }}
      disabled={isUpdating}
      variant={isActive ? "destructive" : "outline"}
      size="sm"
    >
      {isUpdating ? "Updating..." : isActive ? "Deactivate" : "Set Active"}
    </Button>
  );
} 