"use client";

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
import {
  CategoryStageBadge,
  CategoryTypeBadge,
} from "~/app/components/category-fields";
import { MoveCategoryButtons } from "~/app/components/move-category-buttons";
import { NominationItem } from "~/app/components/nomination-item";
import { DangerZone, RunShowCard } from "~/app/components/show-controls";
import { ThemeToggle } from "~/app/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useHostShow } from "~/lib/hooks/useHostShow";
import { showsPictures } from "~/lib/images";
import { getScoreLabel } from "~/lib/scoring";
import { listFormat } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type Session = RouterOutputs["award"]["getSession"];

/**
 * The manage page's show: its categories and nominations, kept up to date from the show's live
 * events (changes made on the run view or another device), with every action showing straight
 * away (useShowChange).
 */
export function ManageShow({
  code,
  initialSession,
}: {
  code: string;
  initialSession: Session;
}) {
  // Not every vote: scores here follow host actions
  const session = useHostShow(code, initialSession, { liveCounts: false });

  // The categories an aggregate can add up
  const sourceOptions = session.categories
    .filter(c => c.type !== "AGGREGATE")
    .map(({ id, name }) => ({ id, name }));

  return (
    <main className="bg-background text-foreground min-h-screen">
      {/* One working column: the show's setup reads top to bottom, in running order */}
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex items-start gap-3 px-1">
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground text-3xl font-bold text-balance sm:text-4xl">
              {session.name}
            </h1>
            <p className="text-muted-foreground mt-1">Set up your show</p>
          </div>
          <ThemeToggle />
        </header>

        <RunShowCard
          code={code}
          sessionId={session.id}
          screenTheme={session.screenTheme}
        />

        <div className="space-y-8">
          {/* Categories in running order, then adding one at the end */}
          <section aria-labelledby="categories" className="space-y-4">
            <div className="px-1">
              <h2
                id="categories"
                className="text-foreground text-2xl font-bold"
              >
                Categories
              </h2>
              <p className="text-muted-foreground text-sm">
                Each one is an award, in the order they&apos;re presented.
              </p>
            </div>
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
                className="shadow-soft gap-0 overflow-hidden rounded-[24px] border-0 py-0"
              >
                <CardHeader className="border-border border-b p-4 sm:p-5">
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
                      hasVotes: category.nominations.some(n => !!n.score),
                    }}
                    sourceOptions={sourceOptions}
                  >
                    {/* Setting it up on the left, running it on the right (or below, on a phone) */}
                    <CardTitle className="flex items-center gap-2">
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
                        {/* Where it is in the show, once it has started */}
                        <CategoryStageBadge category={category} />
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {/* An aggregate takes no votes of its own */}
                        {category.type !== "AGGREGATE" && (
                          <ResetCategoryVotesButton categoryId={category.id} />
                        )}
                        <EditCategoryButton />
                        <DeleteCategoryButton categoryId={category.id} />
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
                <CardContent className="p-0 pb-3">
                  {category.nominations.length > 0 ? (
                    <ul className="divide-border divide-y">
                      {category.nominations.map(nomination => (
                        <NominationItem
                          key={nomination.id}
                          nomination={nomination}
                          categoryType={category.type}
                          isImage={showsPictures(category)}
                          // Hosts get every score
                          score={`${nomination.score ?? 0} ${getScoreLabel(category, nomination.score ?? 0)}`}
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
            <AddCategory sessionId={session.id} sourceOptions={sourceOptions} />
          </section>

          <DangerZone sessionId={session.id} />
        </div>
      </div>
    </main>
  );
}
