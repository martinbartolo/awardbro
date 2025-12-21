import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveVotingSession } from "~/app/components/live-voting-session";
import { api } from "~/trpc/server";

import ogImage from "./opengraph-image.png";

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
    metadataBase: new URL("https://awardbro.com"),
    title: `Vote Now: ${session.name}`,
    description: `Cast your vote for ${session.name}! Join the live voting session and help choose the winners.`,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    openGraph: {
      title: `Vote Now: ${session.name}`,
      description: `Cast your vote for ${session.name}! Join the live voting session and help choose the winners.`,
      type: "website",
      url: `/vote/${slug}`,
      images: [
        {
          url: ogImage.src,
          width: ogImage.width,
          height: ogImage.height,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Vote Now: ${session.name}`,
      description: `Cast your vote for ${session.name}! Join the live voting session and help choose the winners.`,
      images: [
        {
          url: ogImage.src,
          width: ogImage.width,
          height: ogImage.height,
        },
      ],
    },
  };
}

export default async function VotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
      <LiveVotingSession
        initialSession={session}
        slug={slug}
        initialHasVoted={hasVoted}
      />
    </main>
  );
}
