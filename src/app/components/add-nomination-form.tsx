"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  NominationFields,
  usePicture,
} from "~/app/components/nomination-fields";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { type CategoryType } from "~/generated/prisma/enums";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import {
  nominationFieldsSchema,
  type NominationFieldValues,
} from "~/lib/schemas";
import { useTRPC } from "~/trpc/react";

type AddNominationFormProps = {
  categoryId: string;
  categoryType?: CategoryType;
};

export function AddNominationForm({
  categoryId,
  categoryType = "NORMAL",
}: AddNominationFormProps) {
  const router = useRouter();
  const form = useForm<NominationFieldValues>({
    resolver: zodResolver(nominationFieldsSchema),
    defaultValues: { name: "", description: "" },
  });

  const trpc = useTRPC();
  const onManageError = useManageErrorHandler();
  const addNomination = useMutation(
    trpc.award.addNomination.mutationOptions({
      onSuccess: () => {
        toast.success("Nomination added successfully");
        form.reset();
        router.refresh();
      },
      onError: onManageError(),
    }),
  );

  const isImageCategory = categoryType === "IMAGE";

  const { picture, canSave } = usePicture(form, isImageCategory);

  const onSubmit = (values: NominationFieldValues) => {
    if (!canSave()) return;
    addNomination.mutate({ ...values, categoryId });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <NominationFields control={form.control} picture={picture} />

        <Button
          type="submit"
          variant="secondary"
          disabled={addNomination.isPending}
        >
          {addNomination.isPending ? "Adding..." : "Add Nomination"}
        </Button>
      </form>
    </Form>
  );
}
