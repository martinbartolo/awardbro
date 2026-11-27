import { CircleQuestionMark } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";

import { AddCategory } from "~/app/components/add-category-form";
import { AddNomination } from "~/app/components/add-nomination-form";
import {
  DeleteCategoryButton,
  ResetCategoryVotesButton,
} from "~/app/components/category-actions";
import {
  CategoryEditor,
  EditCategoryButton,
} from "~/app/components/category-editor";
import { CategoryTypeBadge } from "~/app/components/category-fields";
import { MoveCategoryButtons } from "~/app/components/move-category-buttons";
import { NominationItem } from "~/app/components/nomination-item";
import { PasswordVerification } from "~/app/components/password-verification";
import { RevealCategoryButton } from "~/app/components/reveal-category-button";
import { SetActiveCategoryButton } from "~/app/components/set-active-category-button";
import { DangerZone, RunShowCard } from "~/app/components/show-controls";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { showsPictures } from "~/lib/images";
import { getScoreLabel } from "~/lib/scoring";
import { hasManageAccess } from "~/server/auth/manage";
import { showPageCode } from "~/server/shows";
import { api } from "~/trpc/server";

/** Lists an aggregate's sources as "A, B and C" */
const listFormat = new Intl.ListFormat("en");

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

        <div className="space-y-8">
          {/* Categories in running order, then adding one at the end */}
          <>
            <section aria-labelledby="categories" className="space-y-4">
              <h2
                id="categories"
                className="text-foreground text-2xl font-semibold"
              >
                Categories
              </h2>
              {session.categories.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Each category is one award. Add the first one.
                </p>
              )}
              {session.categories.map((category, index) => (
                <Card
                  key={category.id}
                  role="region"
                  aria-label={category.name}
                  className="border-border"
                >
                  <CardHeader className="border-border border-b p-4 sm:p-6">
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
                        hideVoteCounts: category.hideVoteCounts,
                        winnerOnly: category.winnerOnly,
                      }}
                      sourceOptions={sourceOptions}
                    >
                      {/* Setting it up on the left, running it on the right (or below, on a phone) */}
                      <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <MoveCategoryButtons
                            categoryId={category.id}
                            categoryName={category.name}
                            index={index}
                            count={session.categories.length}
                          />
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <span className="text-xl">{category.name}</span>
                            <CategoryTypeBadge
                              type={category.type}
                              rankingTop={category.rankingTop}
                            />
                            {/* Presentation options, set in the edit form */}
                            {category.hideVoteCounts && (
                              <Badge variant="outline">Counts hidden</Badge>
                            )}
                            {category.winnerOnly && (
                              <Badge variant="outline">Winner only</Badge>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <EditCategoryButton />
                            <DeleteCategoryButton categoryId={category.id} />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ResetCategoryVotesButton categoryId={category.id} />
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
                      {category.type === "AGGREGATE" && (
                        <p className="text-muted-foreground text-sm">
                          Adds up{" "}
                          {listFormat.format(
                            category.sourceCategories.map(s => s.name),
                          )}
                          .
                        </p>
                      )}
                    </CategoryEditor>
                  </CardHeader>
                  <CardContent className="p-0 pb-2">
                    {category.nominations.length > 0 ? (
                      <ul className="divide-border divide-y">
                        {category.nominations.map(nomination => (
                          <NominationItem
                            key={nomination.id}
                            nomination={nomination}
                            categoryType={category.type}
                            isImage={showsPictures(category)}
                            score={`${nomination._count.votes} ${getScoreLabel(category, nomination._count.votes)}`}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground px-4 py-3 text-sm">
                        {category.type === "AGGREGATE"
                          ? "Its nominations appear here as they're added to the categories it adds up."
                          : "No nominations yet."}
                      </p>
                    )}
                    {/* An aggregate's nominations are copies of its sources' */}
                    {category.type !== "AGGREGATE" && (
                      <div className="px-3 pt-1">
                        <AddNomination
                          categoryId={category.id}
                          categoryType={category.type}
                          isEmpty={category.nominations.length === 0}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              <AddCategory
                sessionId={session.id}
                sourceOptions={sourceOptions}
              />
            </section>
          </>

          <DangerZone sessionId={session.id} />
        </div>
      </div>
    </main>
  );
}
