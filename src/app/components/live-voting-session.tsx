'use client';

import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { VotingInterface } from "./voting-interface";
import { type RouterOutputs } from "~/trpc/react";

type Session = RouterOutputs["award"]["getSessionBySlug"];

interface LiveVotingSessionProps {
  initialSession: Session;
  slug: string;
  initialHasVoted: boolean;
}

export function LiveVotingSession({ initialSession, slug, initialHasVoted }: LiveVotingSessionProps) {
  const { data: session } = api.award.getSessionBySlug.useQuery(
    { slug },
    {
      refetchInterval: 5000,
      initialData: initialSession,
    }
  );

  const activeCategory = session.categories.find((category) => category.isActive);

  if (!activeCategory) {
    return (
      <div className="container mx-auto px-4 text-center">
        <h1 className="mb-12 text-6xl font-bold">{session.name}</h1>
        <p className="text-2xl">Voting is currently closed.</p>
      </div>
    );
  }

  const { data: hasVoted = initialHasVoted } = api.award.hasVoted.useQuery(
    { categoryId: activeCategory.id },
    {
      refetchInterval: 5000,
      initialData: initialHasVoted,
    }
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold">{session.name}</h1>
        <p className="mt-2 text-gray-400">Cast your vote</p>
        {hasVoted && (
          <p className="mt-2 text-yellow-400">You have already voted in this category</p>
        )}
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{activeCategory.name}</CardTitle>
          {activeCategory.description && (
            <p className="text-sm text-gray-400">{activeCategory.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <VotingInterface
            nominations={activeCategory.nominations}
            hasVoted={hasVoted}
          />
        </CardContent>
      </Card>
    </div>
  );
} 