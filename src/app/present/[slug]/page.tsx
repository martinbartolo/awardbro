import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { LivePresentation } from "~/app/components/live-presentation";
import { type Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const session = await api.award.getSessionBySlug({ slug, activeOnly: true });

  if (!session) {
    return {
      title: "Award Show Not Found",
      description: "This award show presentation does not exist.",
    };
  }

  return {
    title: `${session.name} - Live Presentation`,
    description: `Live presentation of ${session.name}. Watch the results unfold in real-time!`,
    openGraph: {
      title: `${session.name} - Live Presentation`,
      description: `Live presentation of ${session.name}. Watch the results unfold in real-time!`,
      type: "website",
      url: `/present/${slug}`,
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
      title: `${session.name} - Live Presentation`,
      description: `Live presentation of ${session.name}. Watch the results unfold in real-time!`,
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

export default async function PresentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await api.award.getSessionBySlug({ slug, activeOnly: true });

  if (!session) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <LivePresentation initialSession={session} slug={slug} />
    </main>
  );
}
