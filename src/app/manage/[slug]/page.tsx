import { HelpCircle } from "lucide-react";
import { type Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AddCategoryForm } from "~/app/components/add-category-form";
import { AddNominationForm } from "~/app/components/add-nomination-form";
import { CategoryActions } from "~/app/components/category-actions";
import { NominationActions } from "~/app/components/nomination-actions";
import { PasswordVerification } from "~/app/components/password-verification";
import { RevealCategoryButton } from "~/app/components/reveal-category-button";
import { SessionActions } from "~/app/components/session-actions";
import { SetActiveCategoryButton } from "~/app/components/set-active-category-button";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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

const NominationDescription = ({ description }: { description: string }) => {
  const isImageUrl = (url: string) => {
    // Only allow specific image extensions and Google Drive URLs
    return (
      /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url) ||
      (url.includes("drive.google.com") && url.includes("/file/d/"))
    );
  };

  const getImageUrl = (url: string) => {
    if (url.includes("drive.google.com")) {
      // Only handle the secure /file/d/ format for Google Drive
      const matches = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(url);
      const fileId = matches?.[1];

      if (!fileId) return "";

      // Use the secure direct access URL
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return url;
  };

  if (!description) return null;

  if (!isImageUrl(description)) {
    return (
      <div className="text-muted-foreground mt-1 text-sm">
        {/* Ensure text content is escaped properly */}
        {description}
      </div>
    );
  }

  const imageUrl = getImageUrl(description);
  if (!imageUrl) {
    return (
      <div className="text-muted-foreground mt-1 text-sm">
        Invalid image URL provided
      </div>
    );
  }

  return (
    <div className="relative mt-1 h-48 w-full">
      <Image
        src={imageUrl}
        alt="Nomination image"
        fill
        className="rounded-md object-contain"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};

export default async function ManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await api.award.getSessionBySlug({
    slug,
  });

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <PasswordVerification slug={slug}>
          {/* Header Section */}
          <div className="bg-card mb-8 rounded-lg p-6">
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
                    <HelpCircle className="h-4 w-4" />
                    Help
                  </Link>
                </Button>
              </div>
              {/* Actions Row */}
              <SessionActions slug={slug} sessionId={session.id} />
            </div>
          </div>

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
                    <CardTitle className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-xl">{category.name}</span>
                        {category.isAggregate && (
                          <Badge variant="secondary" className="ml-2">
                            Aggregate
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CategoryActions categoryId={category.id} />
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
                    {category.isAggregate &&
                      category.sourceCategories.length > 0 && (
                        <div className="mt-2">
                          <p className="text-muted-foreground max-w-(--breakpoint-md) text-sm">
                            This is an aggregate category that automatically
                            sums up votes from its source categories. Each
                            nomination&apos;s vote count represents the total
                            votes across all source categories.
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
                  </CardHeader>
                  <CardContent className="mt-4">
                    <div className="mb-6">
                      <h3 className="text-foreground mb-3 text-lg font-medium">
                        Add Nomination
                      </h3>
                      {category.isAggregate ? (
                        <div className="space-y-2">
                          <p className="text-muted-foreground max-w-(--breakpoint-md) text-sm">
                            Nominations for aggregate categories are
                            automatically synced from source categories. New
                            nominations will appear here when they are added to
                            any source category.
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Vote counts shown are the sum of votes across all
                            source categories and update automatically.
                          </p>
                        </div>
                      ) : (
                        <AddNominationForm categoryId={category.id} />
                      )}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-foreground text-lg font-medium">
                        Nominations
                      </h3>
                      {category.nominations.map(nomination => (
                        <div
                          key={nomination.id}
                          className="bg-secondary hover:bg-secondary/80 flex items-center justify-between rounded-lg p-4 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="text-secondary-foreground font-semibold">
                              {nomination.name}
                            </div>
                            <NominationDescription
                              description={nomination.description ?? ""}
                            />
                            <div className="text-accent mt-2 text-sm">
                              {nomination._count.votes} votes
                            </div>
                          </div>
                          <NominationActions
                            nominationId={nomination.id}
                            nominationName={nomination.name}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          </div>
        </PasswordVerification>
      </div>
    </main>
  );
}
