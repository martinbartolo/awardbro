import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { VoteButton } from "~/app/_components/vote-button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default async function VotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await api.award.getSessionBySlug({ slug });

  if (!session) {
    notFound();
  }

  const activeCategory = session.categories.find((category) => category.isActive);

  if (!activeCategory) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-12 text-6xl font-bold">{session.name}</h1>
          <p className="text-2xl">Voting is currently closed.</p>
        </div>
      </main>
    );
  }

  const hasVoted = await api.award.hasVoted({ categoryId: activeCategory.id });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">{session.name}</h1>
          <p className="mt-2 text-gray-400">Cast your vote</p>
          {hasVoted && (
            <p className="mt-2 text-yellow-400">You have already voted in this category</p>
          )}
        </div>

        <Card className="mx-auto max-w-2xl bg-white/5">
          <CardHeader>
            <CardTitle>{activeCategory.name}</CardTitle>
            {activeCategory.description && (
              <p className="text-sm text-gray-400">{activeCategory.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCategory.nominations.map((nomination) => (
                <div
                  key={nomination.id}
                  className="flex items-center justify-between rounded-lg bg-white/10 p-4"
                >
                  <div>
                    <div className="font-semibold">{nomination.name}</div>
                    {nomination.description && (
                      <div className="text-sm text-gray-400">
                        {nomination.description}
                      </div>
                    )}
                  </div>
                  <VoteButton
                    nominationId={nomination.id}
                    hasVoted={hasVoted}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 