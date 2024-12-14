import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { LiveVotingSession } from "~/app/components/live-voting-session";
import { type Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const session = await api.award.getSessionBySlug({ slug: params.slug });

  if (!session) {
    return {
      title: "Award Show Not Found",
      description: "This award show voting session does not exist.",
    };
  }

  return {
    title: `Vote Now: ${session.name}`,
    description: `Cast your vote for ${session.name}! Join the live voting session and help choose the winners.`,
    openGraph: {
      title: `Vote Now: ${session.name}`,
      description: `Cast your vote for ${session.name}! Join the live voting session and help choose the winners.`,
      type: "website",
      url: `/vote/${params.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Vote Now: ${session.name}`,
      description: `Cast your vote for ${session.name}! Join the live voting session and help choose the winners.`,
    },
  };
}

export default async function VotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await api.award.getSessionBySlug({ slug });

  if (!session) {
    notFound();
  }

  const activeCategory = session.categories.find((category) => category.isActive);

  if (!activeCategory) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-12 text-6xl font-bold">{session.name}</h1>
          <p className="text-2xl">Voting is currently closed.</p>
        </div>
      </main>
    );
  }

  const hasVoted = await api.award.hasVoted({ categoryId: activeCategory.id });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <LiveVotingSession initialSession={session} slug={slug} initialHasVoted={hasVoted} />
    </main>
  );
}
