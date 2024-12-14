import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { LiveVotingSession } from "~/app/components/live-voting-session";
import { type Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const session = await api.award.getSessionBySlug({ slug });

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
      url: `/vote/${slug}`,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Vote Now: ${session.name}`,
      description: `Cast your vote for ${session.name}! Join the live voting session and help choose the winners.`,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function VotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await api.award.getSessionBySlug({
    slug,
    activeOnly: true,
  });

  if (!session) {
    notFound();
  }

  // Since we're using activeOnly, we know there's at most one category
  const activeCategory = session.categories[0];
  const hasVoted = activeCategory
    ? await api.award.hasVoted({ categoryId: activeCategory.id })
    : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <LiveVotingSession initialSession={session} slug={slug} initialHasVoted={hasVoted} />
    </main>
  );
}
