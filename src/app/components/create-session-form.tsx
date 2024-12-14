"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";

export function CreateSessionForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSession.mutate({ name, slug, password: password || undefined });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    // Generate a URL-friendly slug from the name
    setSlug(newName.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Award Show</CardTitle>
        <CardDescription>Create a new award show and share it with your friends</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g., Movie Awards 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="movie-awards-2024"
              required
              pattern="[a-z0-9-]+"
            />
            <p className="text-xs text-muted-foreground">
              Your award show will be available at: /vote/
              <span className="font-mono">{slug || "your-url"}</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password to protect management access"
            />
          </div>

          <div className="flex items-start gap-2 rounded-md bg-muted p-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Make sure to save your management URL and password. You&apos;ll need both to manage
              your award show!
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={createSession.isPending}>
            {createSession.isPending ? "Creating..." : "Create Award Show"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
