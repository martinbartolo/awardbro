import { type Metadata } from "next";

import { FullscreenButton } from "~/app/components/fullscreen-button";
import { LivePresentation } from "~/app/components/live-presentation";
import { showPageCode } from "~/server/shows";
import { api } from "~/trpc/server";

import ogImage from "./opengraph-image.png";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const code = await showPageCode("present", (await params).code);
  const session = await api.award.getSession({ code, activeOnly: true });

  return {
    metadataBase: new URL("https://awardbro.com"),
    title: `${session.name} - Live Presentation`,
    description: `Live presentation of ${session.name}. Watch the results unfold in real-time!`,
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
      title: `${session.name} - Live Presentation`,
      description: `Live presentation of ${session.name}. Watch the results unfold in real-time!`,
      type: "website",
      url: `/present/${code}`,
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
      title: `${session.name} - Live Presentation`,
      description: `Live presentation of ${session.name}. Watch the results unfold in real-time!`,
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

export default async function PresentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = await showPageCode("present", (await params).code);
  const session = await api.award.getSession({ code, activeOnly: true });

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
      <FullscreenButton />
      <LivePresentation initialSession={session} code={code} />
    </main>
  );
}
