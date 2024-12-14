import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { LivePresentation } from "~/app/components/live-presentation";
import { type Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const session = await api.award.getSessionBySlug({ slug: params.slug, activeOnly: true });

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
      url: `/present/${params.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${session.name} - Live Presentation`,
      description: `Live presentation of ${session.name}. Watch the results unfold in real-time!`,
    },
  };
}

export default async function PresentPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
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
