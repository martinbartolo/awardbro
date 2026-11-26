import {
  CircleQuestionMark,
  ImageIcon,
  Layers,
  ListOrdered,
} from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";

import { AddCategoryForm } from "~/app/components/add-category-form";
import { AddNominationForm } from "~/app/components/add-nomination-form";
import { CategoryActions } from "~/app/components/category-actions";
import {
  CategoryEditor,
  EditCategoryButton,
} from "~/app/components/category-editor";
import { NominationItem } from "~/app/components/nomination-item";
import { PasswordVerification } from "~/app/components/password-verification";
import { RevealCategoryButton } from "~/app/components/reveal-category-button";
import { SetActiveCategoryButton } from "~/app/components/set-active-category-button";
import { DangerZone, RunShowCard } from "~/app/components/show-controls";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getScoreLabel } from "~/lib/scoring";
import { hasManageAccess } from "~/server/auth/manage";
import { showPageCode } from "~/server/shows";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Manage Award Show",
  description: "Manage your award show settings and categories",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function ManagePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = await showPageCode("manage", (await params).code);

  const session = await api.award.getSession({
    code,
  });

  if (!(await hasManageAccess(code))) {
    return (
      <main className="bg-background text-foreground min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <PasswordVerification code={code} />
        </div>
      </main>
    );
  }

  // The categories an aggregate can add up
  const sourceOptions = session.categories
    .filter(c => c.type !== "AGGREGATE")
    .map(({ id, name }) => ({ id, name }));

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-6 px-1">
          <div className="flex flex-col gap-6">
            {/* Title Row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
                  {session.name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your award show
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/help" target="_blank">
                  <CircleQuestionMark className="h-4 w-4" />
                  Help
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <RunShowCard code={code} />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Add Category Section */}
          <section className="bg-card rounded-lg p-6">
            <h2 className="text-foreground mb-4 text-2xl font-semibold">
              Add New Category
            </h2>
            <AddCategoryForm sessionId={session.id} />
          </section>

          {/* Categories List */}
          <section className="space-y-6">
            <h2 className="text-foreground text-2xl font-semibold">
              Categories
            </h2>
            {session.categories.map(category => (
              <Card key={category.id} className="border-border">
                <CardHeader className="border-border border-b">
                  <CategoryEditor
                    category={{
                      id: category.id,
                      name: category.name,
                      description: category.description,
                      type: category.type,
                      rankingTop: category.rankingTop,
                      sourceCategoryIds: category.sourceCategories.map(
                        s => s.id,
                      ),
                      // Hosts get every score, and any vote gives a nomination one
                      hasVotes: category.nominations.some(
                        n => n._count.votes > 0,
                      ),
                    }}
                    sourceOptions={sourceOptions}
                  >
                    <CardTitle className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl">{category.name}</span>
                        {category.type === "AGGREGATE" && (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-purple-500/15 px-2.5 py-1 text-purple-600 dark:text-purple-400"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Aggregate
                          </Badge>
                        )}
                        {category.type === "IMAGE" && (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-blue-500/15 px-2.5 py-1 text-blue-600"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            Image
                          </Badge>
                        )}
                        {category.type === "RANKING" && (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400"
                          >
                            <ListOrdered className="h-3.5 w-3.5" />
                            Ranking (Top {category.rankingTop})
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <EditCategoryButton />
                        <CategoryActions
                          categoryId={category.id}
                          hideVoteCounts={category.hideVoteCounts}
                          winnerOnly={category.winnerOnly}
                        />
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
                      <p className="text-muted-foreground text-sm">
                        {category.description}
                      </p>
                    )}
                    {category.type === "AGGREGATE" &&
                      category.sourceCategories.length > 0 && (
                        <div className="mt-2">
                          <p className="text-muted-foreground max-w-(--breakpoint-md) text-sm">
                            This is an aggregate category that automatically
                            adds up the scores from its source categories. Each
                            nomination&apos;s score is its total across all
                            source categories.
                          </p>
                          <p className="text-muted-foreground mt-2 text-sm font-medium">
                            Source Categories:
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {category.sourceCategories.map(sourceCategory => (
                              <Badge key={sourceCategory.id} variant="outline">
                                {sourceCategory.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {category.type === "RANKING" && category.rankingTop && (
                      <div className="mt-2">
                        <p className="text-muted-foreground max-w-(--breakpoint-md) text-sm">
                          Voters rank their top {category.rankingTop} choices.
                          Points are awarded by position: 1st place ={" "}
                          {category.rankingTop} points, 2nd ={" "}
                          {category.rankingTop - 1} points, etc.
                        </p>
                      </div>
                    )}
                  </CategoryEditor>
                </CardHeader>
                <CardContent className="mt-4">
                  <div className="mb-6">
                    <h3 className="text-foreground mb-3 text-lg font-medium">
                      Add Nomination
                    </h3>
                    {category.type === "AGGREGATE" ? (
                      <div className="space-y-2">
                        <p className="text-muted-foreground max-w-(--breakpoint-md) text-sm">
                          Nominations for aggregate categories are automatically
                          synced from source categories. New nominations will
                          appear here when they are added to any source
                          category.
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Scores shown are the totals across all source
                          categories and update automatically.
                        </p>
                      </div>
                    ) : (
                      <AddNominationForm
                        categoryId={category.id}
                        categoryType={category.type}
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-foreground text-lg font-medium">
                      Nominations
                    </h3>
                    {category.nominations.map(nomination => (
                      <NominationItem
                        key={nomination.id}
                        nomination={nomination}
                        categoryType={category.type}
                        score={`${nomination._count.votes} ${getScoreLabel(category, nomination._count.votes)}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <DangerZone sessionId={session.id} />
        </div>
      </div>
    </main>
  );
}
