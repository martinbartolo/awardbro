"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { VotingInterface } from "./voting-interface";
import { type RouterOutputs } from "~/trpc/react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { useEffect } from "react";

type Session = RouterOutputs["award"]["getSessionBySlug"];

interface LiveVotingSessionProps {
  initialSession: Session;
  slug: string;
  initialHasVoted: boolean;
}

export function LiveVotingSession({
  initialSession,
  slug,
  initialHasVoted,
}: LiveVotingSessionProps) {
  const {
    data: session,
    error: sessionError,
    isError: isSessionError,
  } = api.award.getSessionBySlug.useQuery(
    { slug },
    {
      refetchInterval: 5000,
      initialData: initialSession,
      retry: 3,
    }
  );

  const activeCategory = session.categories.find((category) => category.isActive);

  const {
    data: hasVoted = initialHasVoted,
    error: voteError,
    isError: isVoteError,
  } = api.award.hasVoted.useQuery(
    { categoryId: activeCategory?.id ?? "" },
    {
      refetchInterval: 5000,
      initialData: initialHasVoted,
      retry: 3,
      enabled: !!activeCategory,
    }
  );

  useEffect(() => {
    if (isSessionError) {
      toast.error("Failed to fetch session updates");
    }
  }, [isSessionError]);

  useEffect(() => {
    if (isVoteError) {
      toast.error("Failed to check voting status");
    }
  }, [isVoteError]);

  if (isSessionError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {sessionError?.message || "Failed to load voting session"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!activeCategory) {
    return (
      <div className="container mx-auto px-4 text-center">
        <h1 className="mb-12 text-6xl font-bold">{session.name}</h1>
        <p className="text-2xl">Voting is currently closed.</p>
        <p className="mt-4 text-muted-foreground">
          Please wait for the host to activate a category.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold">{session.name}</h1>
        <p className="mt-2 text-muted-foreground">Cast your vote</p>
        {hasVoted && <p className="mt-2 text-chart-2">You have already voted in this category</p>}
        {voteError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              {voteError.message || "There was an error checking your vote status"}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{activeCategory.name}</CardTitle>
          {activeCategory.description && (
            <p className="text-sm text-muted-foreground">{activeCategory.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <VotingInterface nominations={activeCategory.nominations} hasVoted={hasVoted} />
        </CardContent>
      </Card>
    </div>
  );
}
