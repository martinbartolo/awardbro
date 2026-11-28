import { type Metadata } from "next";

import { LiveVotingSession } from "~/app/components/live-voting-session";
import { showPage } from "~/server/shows";
import { api } from "~/trpc/server";

import ogImage from "./opengraph-image.png";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code, name } = await showPage("vote", (await params).code);

  return {
    metadataBase: new URL("https://awardbro.com"),
    title: `Vote Now: ${name}`,
    description: `Cast your vote for ${name}! Join the live voting session and help choose the winners.`,
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
      title: `Vote Now: ${name}`,
      description: `Cast your vote for ${name}! Join the live voting session and help choose the winners.`,
      type: "website",
      url: `/vote/${code}`,
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
      title: `Vote Now: ${name}`,
      description: `Cast your vote for ${name}! Join the live voting session and help choose the winners.`,
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
  params: Promise<{ code: string }>;
}) {
  const { code } = await showPage("vote", (await params).code);
  const session = await api.award.getSession({
    code,
    activeOnly: true,
  });
  // The voter's own votes in the active category, so a voter who has voted
  // sees it straight away instead of an empty form
  const activeCategory = session.categories[0];
  const initialMyVotes =
    activeCategory && activeCategory.type !== "AGGREGATE"
      ? {
          categoryId: activeCategory.id,
          votes: await api.award.getMyVotes({ categoryId: activeCategory.id }),
        }
      : undefined;

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
      <LiveVotingSession
        initialSession={session}
        initialMyVotes={initialMyVotes}
        code={code}
      />
    </main>
  );
}
