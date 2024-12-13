"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertCircle } from "lucide-react";

export function CreateSessionForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const createSession = api.award.createSession.useMutation({
    onSuccess: (data) => {
      router.push(`/manage/${data.slug}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSession.mutate({ name, slug });
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
        <CardTitle>Create a New Award Show</CardTitle>
        <CardDescription className="space-y-2">
          <p>Start a new award show session that you can share with your friends</p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Award Show Name</Label>
            <Input
              id="name"
              value={name}
              onChange={handleNameChange}
              placeholder="Annual Friend Awards 2024"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="friend-awards-2024"
              required
              pattern="[a-z0-9-]+"
            />
            <p className="text-sm text-muted-foreground">
              This will be used in the URL: /vote/<span className="font-mono">{slug}</span>
            </p>
            <div className="flex items-start gap-2 rounded-md bg-muted p-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Make sure to bookmark or save your management URL after creation. This will be your only way to access and manage your award show!
            </p>
          </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={createSession.isPending}
          >
            {createSession.isPending ? "Creating..." : "Create Award Show"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 