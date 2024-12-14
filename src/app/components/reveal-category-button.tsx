"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RevealCategoryButton({
  categoryId,
  revealed,
}: {
  categoryId: string;
  revealed: boolean;
}) {
  const router = useRouter();
  const revealCategory = api.award.revealCategory.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to reveal winners");
    },
  });

  if (revealed) {
    return (
      <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-500 flex items-center gap-2">
        Winners Revealed
      </span>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => revealCategory.mutate({ id: categoryId })}
      disabled={revealCategory.isPending}
    >
      {revealCategory.isPending ? "Revealing..." : "Reveal Winners"}
    </Button>
  );
}
