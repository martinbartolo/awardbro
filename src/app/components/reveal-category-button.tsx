"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Award, Ban } from "lucide-react";

export function RevealCategoryButton({
  categoryId,
  revealed,
}: {
  categoryId: string;
  revealed: boolean;
}) {
  const router = useRouter();
  const toggleReveal = api.award.toggleRevealCategory.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: () => {
      toast.error(revealed ? "Failed to hide winner" : "Failed to reveal winner");
    },
  });

  return (
    <Button
      size="sm"
      variant={revealed ? "destructive" : "default"}
      onClick={() => toggleReveal.mutate({ id: categoryId })}
      disabled={toggleReveal.isPending}
      className="group"
    >
      {toggleReveal.isPending ? (
        "Updating..."
      ) : revealed ? (
        <>
          Hide Winner
          <Ban className="size-4 transition-transform duration-200 group-hover:scale-110" />
        </>
      ) : (
        <>
          Reveal Winner
          <Award className="size-4 transition-transform duration-200 group-hover:scale-110" />
        </>
      )}
    </Button>
  );
}
