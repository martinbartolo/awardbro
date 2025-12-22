"use client";

import { useState } from "react";

import { VoteIcon, WrenchIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function ExistingSessions() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  const normalizeSlug = (input: string) => {
    // Strip any existing prefixes the user might have pasted
    return input.replace(/^\/?(vote|manage|present)\//, "").trim();
  };

  const handleVote = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeSlug(slug);
    if (normalized) {
      router.push(`/vote/${normalized}`);
    }
  };

  const handleManage = () => {
    const normalized = normalizeSlug(slug);
    if (normalized) {
      router.push(`/manage/${normalized}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Existing Show</CardTitle>
        <CardDescription>
          Enter the name of an existing award show
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVote} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="existing-url">Award Show Name</Label>
            <Input
              id="existing-url"
              value={slug}
              onChange={e => setSlug(e.target.value.trim())}
              placeholder="e.g., movie-awards-2024"
              autoCapitalize="off"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="flex-1" disabled={!slug}>
              <VoteIcon className="h-4 w-4" />
              Vote
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleManage}
              disabled={!slug}
            >
              <WrenchIcon className="h-4 w-4" />
              Manage
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
