"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { type CategoryType } from "~/generated/prisma/enums";
import { isValidImageUrl } from "~/lib/images";
import { nominationFormSchema, type NominationFormValues } from "~/lib/schemas";
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
  const form = useForm<NominationFormValues>({
    resolver: zodResolver(nominationFormSchema),
    defaultValues: {
      categoryId,
      name: "",
      description: "",
    },
  });

  const trpc = useTRPC();
  const addNomination = useMutation(
    trpc.award.addNomination.mutationOptions({
      onSuccess: () => {
        toast.success("Nomination added successfully");
        form.reset();
        router.refresh();
      },
      onError: error => {
        if (error instanceof TRPCClientError) {
          toast.error(error.message);
        } else {
          toast.error("Failed to add nomination. Please try again.");
        }
      },
    }),
  );

  const isImageCategory = categoryType === "IMAGE";

  const onSubmit = (values: NominationFormValues) => {
    // Validate image URL for IMAGE categories
    if (isImageCategory) {
      if (!values.description) {
        toast.error("Image URL is required for image categories");
        return;
      }
      if (!isValidImageUrl(values.description)) {
        toast.error(
          "Please enter a valid image URL (e.g., ending in .jpg, .png, .gif, .webp, or from imgur, Google Drive, etc.)",
        );
        return;
      }
    }
    addNomination.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isImageCategory ? "Image Caption" : "Nomination Name"}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={
                    isImageCategory
                      ? "Enter a caption for this image"
                      : "Enter nomination"
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isImageCategory ? "Image URL" : "Description (Optional)"}
              </FormLabel>
              {isImageCategory && (
                <p className="text-muted-foreground mb-3 max-w-(--breakpoint-md) text-sm">
                  Paste a direct image URL (e.g., .jpg, .png, .gif) or a link
                  from imgur, Google Drive, Unsplash, etc.
                </p>
              )}
              <FormControl>
                {isImageCategory ? (
                  <Input
                    {...field}
                    placeholder="https://example.com/image.jpg"
                  />
                ) : (
                  <Textarea
                    {...field}
                    placeholder="Add some details..."
                    rows={2}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
