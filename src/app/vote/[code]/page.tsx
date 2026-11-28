import { type Metadata } from "next";

import { LiveVotingSession } from "~/app/components/live-voting-session";
import { DEVICE_THEME_SCRIPT } from "~/lib/device-theme-script";
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
  const show = await api.award.getActiveCategory({ code });
  // The voter's own votes in the active category, so a voter who has voted
  // sees it straight away instead of an empty form
  const activeCategory = show.category;
  const initialMyVotes =
    activeCategory && activeCategory.type !== "AGGREGATE"
      ? {
          categoryId: activeCategory.id,
          votes: await api.award.getMyVotes({ categoryId: activeCategory.id }),
        }
      : undefined;

  return (
    <>
      {/* The phone's light or dark theme, before the first paint (a fixed script, see device-theme.ts) */}
      <script dangerouslySetInnerHTML={{ __html: DEVICE_THEME_SCRIPT }} />
      <LiveVotingSession
        initialShow={show}
        initialMyVotes={initialMyVotes}
        code={code}
      />
    </>
  );
}
