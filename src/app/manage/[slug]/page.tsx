import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { AddCategoryForm } from "~/app/_components/add-category-form";
import { AddNominationForm } from "~/app/_components/add-nomination-form";
import { RevealCategoryButton } from "~/app/_components/reveal-category-button";
import { SetActiveCategoryButton } from "~/app/_components/set-active-category-button";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import Link from "next/link";

export default async function ManagePage(props: {
  params: { slug: string };
}) {
  const slug = props.params.slug;

  const session = await api.award.getSessionBySlug({
    slug,
  });

  if (!session) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">{session.name}</h1>
            <p className="text-gray-400">Manage your award show</p>
          </div>
          <div className="space-x-4">
            <Button variant="outline" asChild>
              <Link href={`/vote/${slug}`} target="_blank">
                Voting Page
              </Link    >
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/present/${slug}`} target="_blank">
                Presentation
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <AddCategoryForm sessionId={session.id} />
          </div>

          <div className="space-y-6">
            {session.categories.map((category) => (
              <Card key={category.id} className="bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <div className="flex gap-2">
                      <SetActiveCategoryButton
                        categoryId={category.id}
                        isActive={category.isActive}
                      />
                      <RevealCategoryButton
                        categoryId={category.id}
                        revealed={category.revealed}
                      />
                    </div>
                  </CardTitle>
                  {category.description && (
                    <p className="text-sm text-gray-400">{category.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <AddNominationForm categoryId={category.id} />
                  </div>
                  <div className="space-y-2">
                    {category.nominations.map((nomination) => (
                      <div
                        key={nomination.id}
                        className="rounded-lg bg-white/10 p-4"
                      >
                        <div className="font-semibold">{nomination.name}</div>
                        {nomination.description && (
                          <div className="text-sm text-gray-400">
                            {nomination.description}
                          </div>
                        )}
                        <div className="mt-2 text-sm">
                          {nomination._count.votes} votes
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
} 