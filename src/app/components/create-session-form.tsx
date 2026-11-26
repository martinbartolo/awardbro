"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { CircleExclamationPoint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { sessionFormSchema, type SessionFormValues } from "~/lib/schemas";
import { useTRPC } from "~/trpc/react";

export function CreateSessionForm() {
  const router = useRouter();
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  const trpc = useTRPC();
  const createSession = useMutation(
    trpc.award.createSession.mutationOptions({
      onSuccess: data => {
        router.push(`/manage/${data.code}`);
      },
      onError: error => {
        if (error instanceof TRPCClientError) {
          toast.error(error.message);
        } else {
          toast.error("Failed to create award show. Please try again.");
        }
      },
    }),
  );

  const onSubmit = (values: SessionFormValues) => {
    createSession.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Award Show</CardTitle>
        <CardDescription>
          Give your show a name. It gets a room code that your guests enter to
          vote.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Movie Awards 2024" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="At least 4 characters"
                      autoCapitalize="off"
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted flex items-start gap-2 rounded-md p-3">
              <CircleExclamationPoint className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-muted-foreground text-sm">
                The room code is on the big screen, so the password is what
                keeps your show to you. You&apos;ll need it to manage the show
                from another device.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createSession.isPending}
            >
              {createSession.isPending ? "Creating..." : "Create Award Show"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
