"use client";

import { useMutation } from "@tanstack/react-query";
import { Award, Ban } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { useTRPC } from "~/trpc/react";

export function RevealCategoryButton({
  categoryId,
  revealed,
}: {
  categoryId: string;
  revealed: boolean;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const toggleReveal = useMutation(
    trpc.award.toggleRevealCategory.mutationOptions({
      onSuccess: () => {
        router.refresh();
      },
      onError: onManageError(
        revealed ? "Failed to hide winner" : "Failed to reveal winner",
      ),
    }),
  );

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
