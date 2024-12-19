"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type NominationFormValues, nominationFormSchema } from "~/lib/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

export function AddNominationForm({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const form = useForm<NominationFormValues>({
    resolver: zodResolver(nominationFormSchema),
    defaultValues: {
      categoryId,
      name: "",
      description: "",
    },
  });

  const addNomination = api.award.addNomination.useMutation({
    onSuccess: () => {
      form.reset();
      router.refresh();
    },
    onError: (error) => {
      if (error instanceof TRPCClientError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add nomination. Please try again.");
      }
    },
  });

  const onSubmit = (values: NominationFormValues) => {
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
              <FormLabel>Nomination Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter nomination" />
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
              <FormLabel>Description (Optional)</FormLabel>
              <p className="mb-3 text-sm text-muted-foreground max-w-screen-md">
                Add a description using text, paste an image URL, or use a Google Drive sharing link
                (make sure the file is set to &quot;Anyone with the link can view&quot;)
              </p>
              <FormControl>
                <Textarea {...field} placeholder="Add some details..." rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={addNomination.isPending}
        >
          {addNomination.isPending ? "Adding..." : "Add Nomination"}
        </Button>
      </form>
    </Form>
  );
}
