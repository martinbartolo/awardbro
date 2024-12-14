"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

export function ExistingSessions() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.startsWith("manage/") || slug.startsWith("/manage/")) {
      router.push(`/${slug}`);
    } else if (slug.startsWith("vote/") || slug.startsWith("/vote/")) {
      router.push(`/${slug}`);
    } else {
      router.push(`/vote/${slug}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Existing Show</CardTitle>
        <CardDescription>Enter the URL of an existing award show</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="existing-url">Award Show URL</Label>
            <Input
              id="existing-url"
              value={slug}
              onChange={(e) => setSlug(e.target.value.trim())}
              placeholder="your-award-show"
              autoCapitalize="off"
            />
            <p className="text-xs text-muted-foreground">
              Enter just the show name for voting, or add manage/ prefix for management
            </p>
          </div>
          <Button type="submit" className="w-full">
            Go to Award Show
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
