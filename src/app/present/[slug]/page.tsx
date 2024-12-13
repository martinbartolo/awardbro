import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { LivePresentation } from "~/app/components/live-presentation";

export default async function PresentPage({
  params,
}: {
  params: { slug: string };
}) {
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