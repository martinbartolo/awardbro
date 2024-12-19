"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SessionFormValues, sessionFormSchema } from "~/lib/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

export function CreateSessionForm() {
  const router = useRouter();
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      password: "",
    },
  });

  const createSession = api.award.createSession.useMutation({
    onSuccess: (data) => {
      sessionStorage.setItem("initial-access", data.slug);
      router.push(`/manage/${data.slug}`);
    },
    onError: (error) => {
      if (error instanceof TRPCClientError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create award show. Please try again.");
      }
    },
  });

  const onSubmit = (values: SessionFormValues) => {
    createSession.mutate({
      name: values.name,
      slug: values.slug,
      password: values.password ?? undefined,
    });
  };

  // Generate a URL-friendly slug from the name
  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    form.setValue("slug", value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Award Show</CardTitle>
        <CardDescription>Create a new award show and share it with your friends</CardDescription>
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
                    <Input
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g., Movie Awards 2024"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="movie-awards-2024" autoCapitalize="off" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Your award show will be available at: /vote/{field.value}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Password</FormLabel>
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Password for management access"
                      autoCapitalize="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-start gap-2 rounded-md bg-muted p-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Make sure to save your management URL and password. You&apos;ll need both to access
                your award show management later!
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={createSession.isPending}>
              {createSession.isPending ? "Creating..." : "Create Award Show"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
