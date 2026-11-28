import { type Metadata } from "next";

import { FullscreenButton } from "~/app/components/fullscreen-button";
import { LivePresentation } from "~/app/components/live-presentation";
import { showPage } from "~/server/shows";
import { api } from "~/trpc/server";

import ogImage from "./opengraph-image.png";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code, name } = await showPage("present", (await params).code);

  return {
    metadataBase: new URL("https://awardbro.com"),
    title: `${name} - Live Presentation`,
    description: `Live presentation of ${name}. Watch the results unfold in real-time!`,
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
      title: `${name} - Live Presentation`,
      description: `Live presentation of ${name}. Watch the results unfold in real-time!`,
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
      title: `${name} - Live Presentation`,
      description: `Live presentation of ${name}. Watch the results unfold in real-time!`,
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
  const { code } = await showPage("present", (await params).code);
  const session = await api.award.getSession({ code, bigScreen: true });

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
      <FullscreenButton />
      <LivePresentation initialSession={session} code={code} />
    </main>
  );
}
