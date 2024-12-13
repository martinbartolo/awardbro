import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { AddCategoryForm } from "~/app/components/add-category-form";
import { AddNominationForm } from "~/app/components/add-nomination-form";
import { RevealCategoryButton } from "~/app/components/reveal-category-button";
import { SetActiveCategoryButton } from "~/app/components/set-active-category-button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { SessionActions } from "~/app/components/session-actions";

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 rounded-lg bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">{session.name}</h1>
              <p className="mt-2 text-muted-foreground">Manage your award show</p>
            </div>
            <SessionActions slug={slug} />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Add Category Section */}
          <section className="rounded-lg bg-card p-6">
            <h2 className="mb-4 text-2xl font-semibold text-foreground">Add New Category</h2>
            <AddCategoryForm sessionId={session.id} />
          </section>

          {/* Categories List */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">Categories</h2>
            {session.categories.map((category) => (
              <Card key={category.id} className="border-border">
                <CardHeader className="border-b border-border">
                  <CardTitle className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xl">{category.name}</span>
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
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  )}
                </CardHeader>
                <CardContent className="mt-4">
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-medium text-foreground">Add Nomination</h3>
                    <AddNominationForm categoryId={category.id} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-foreground">Nominations</h3>
                    {category.nominations.map((nomination) => (
                      <div
                        key={nomination.id}
                        className="rounded-lg bg-secondary p-4 transition-colors hover:bg-secondary/80"
                      >
                        <div className="font-semibold text-secondary-foreground">{nomination.name}</div>
                        {nomination.description && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {nomination.description}
                          </div>
                        )}
                        <div className="mt-2 text-sm text-accent">
                          {nomination._count.votes} votes
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
} 