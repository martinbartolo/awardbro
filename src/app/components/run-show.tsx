"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import { CategoryTypeBadge } from "~/app/components/category-fields";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { useManageErrorHandler } from "~/lib/hooks/useManageErrorHandler";
import { useShowEvents } from "~/lib/hooks/useShowEvents";
import { showPaths } from "~/lib/join";
import {
  type ServerStage,
  STAGE_LABELS,
  stageOf,
  stepsFor,
} from "~/lib/stages";
import { cn } from "~/lib/utils";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

type Session = RouterOutputs["award"]["getSession"];
type Category = Session["categories"][number];
type RevealOptions = { hideVoteCounts?: boolean; winnerOnly?: boolean };

/**
 * The host's controls during the show, one category at a time in the running order: open voting,
 * close it, reveal the winner, then on to the next. One primary button does the next step. Made
 * for a phone, so the host can run the show from beside the big screen.
 */
export function RunShow({
  code,
  initialSession,
}: {
  code: string;
  initialSession: Session;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  // Changes made on another device, and each vote for the live count (useLiveVoters)
  useShowEvents(code, { liveCounts: true });
  const { data: session } = useQuery(
    trpc.award.getSession.queryOptions(
      { code },
      { initialData: initialSession },
    ),
  );
  const { categories } = session;

  // The category the host picked from the running order, if any
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Otherwise the one on the big screen, or the next one to reveal
  const current =
    categories.find(c => c.id === selectedId) ??
    categories.find(c => c.isActive) ??
    nextToReveal(categories);

  const onManageError = useManageErrorHandler();
  const refresh = () =>
    queryClient.invalidateQueries(trpc.award.getSession.queryFilter({ code }));
  const setStage = useMutation(
    trpc.award.setCategoryStage.mutationOptions({
      onSuccess: async () => {
        await refresh();
        setSelectedId(null);
      },
      onError: onManageError(),
    }),
  );
  const setOptions = useMutation(
    trpc.award.setRevealOptions.mutationOptions({
      onSuccess: refresh,
      onError: onManageError(),
    }),
  );

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-muted-foreground text-sm">
            Room code{" "}
            <span className="text-foreground font-mono font-bold tracking-wide">
              {code}
            </span>
          </p>
        </div>
        <nav className="flex shrink-0 flex-col items-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={showPaths.present(code)} target="_blank">
              Big screen
              <ExternalLink className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={showPaths.manage(code)}>
              <ArrowLeft className="size-4" />
              Setup
            </Link>
          </Button>
        </nav>
      </header>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">
          This show has no categories yet. Add them on the setup page.
        </p>
      ) : current ? (
        <CurrentCategory
          key={current.id}
          category={current}
          categories={categories}
          isBusy={setStage.isPending || setOptions.isPending}
          onStage={stage =>
            setStage.mutate({
              id: current.id,
              stage,
              // So a step from an out-of-date page is refused, not undone
              from: stageOf(current),
            })
          }
          onOptions={options =>
            setOptions.mutate({ id: current.id, ...options })
          }
        />
      ) : (
        <section className="bg-card rounded-xl border p-5 text-center">
          <h2 className="text-xl font-semibold">That&apos;s the show!</h2>
          <p className="text-muted-foreground mt-1">
            Every category has been revealed.
          </p>
        </section>
      )}

      {categories.length > 0 && (
        <section aria-labelledby="running-order" className="space-y-2">
          <h2 id="running-order" className="text-lg font-semibold">
            Running order
          </h2>
          <ol className="divide-border divide-y rounded-xl border">
            {categories.map((category, index) => {
              const isCurrent = category.id === current?.id;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(category.id)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "hover:bg-accent/50 flex w-full items-center gap-3 px-4 py-3 text-left",
                      isCurrent && "bg-primary/10",
                    )}
                  >
                    <span className="text-muted-foreground w-5 text-sm">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {category.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {STAGE_LABELS[stageOf(category)]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

/** The category the host is on: where it is, and the buttons for its next step */
function CurrentCategory({
  category,
  categories,
  isBusy,
  onStage,
  onOptions,
}: {
  category: Category;
  categories: Category[];
  isBusy: boolean;
  onStage: (stage: ServerStage) => void;
  onOptions: (options: RevealOptions) => void;
}) {
  const stage = stageOf(category);
  const isAggregate = category.type === "AGGREGATE";
  const isVoting = !isAggregate && (stage === "open" || stage === "closed");
  const voters = useLiveVoters(category, stage === "open");
  const { primary, others, notes, showOptions } = stepsFor({
    stage,
    isAggregate,
    voters,
    next: nextToReveal(categories.filter(c => c.id !== category.id))?.name,
    unrevealedSources: category.sourceCategories
      .filter(source => !source.revealed)
      .map(source => source.name),
    onScreen: categories.find(c => c.isActive && c.id !== category.id)?.name,
  });

  return (
    <section
      aria-labelledby="current-category"
      className="bg-card space-y-4 rounded-xl border p-5"
    >
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          Category {categories.indexOf(category) + 1} of {categories.length} ·{" "}
          <span className="text-foreground font-medium">
            {STAGE_LABELS[stage]}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="current-category" className="text-2xl font-semibold">
            {category.name}
          </h2>
          <CategoryTypeBadge
            type={category.type}
            rankingTop={category.rankingTop}
          />
        </div>
      </div>

      {isVoting && (
        <p className="text-lg" aria-live="polite">
          {voters === 1 ? "1 person has" : `${voters} people have`} voted
        </p>
      )}

      {showOptions && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">The reveal shows</legend>
          <RevealOption
            id="hide-vote-counts"
            label="Hide vote counts"
            description="The order without numbers."
            checked={category.hideVoteCounts}
            disabled={isBusy}
            onChange={hideVoteCounts => onOptions({ hideVoteCounts })}
          />
          <RevealOption
            id="winner-only"
            label="Winner only"
            description="Only first place."
            checked={category.winnerOnly}
            disabled={isBusy}
            onChange={winnerOnly => onOptions({ winnerOnly })}
          />
          {isAggregate && (
            <p className="text-muted-foreground text-xs">
              The options of the categories it adds up apply too.
            </p>
          )}
        </fieldset>
      )}

      {notes.map(note => (
        <p key={note} className="text-muted-foreground text-sm">
          {note}
        </p>
      ))}

      {primary && (
        <Button
          size="lg"
          className="w-full"
          disabled={isBusy || primary.disabled}
          onClick={() => onStage(primary.stage)}
        >
          {primary.label}
        </Button>
      )}
      {others.map(step => (
        <Button
          key={step.label}
          variant="ghost"
          className="w-full"
          disabled={isBusy}
          onClick={() => onStage(step.stage)}
        >
          {step.label}
        </Button>
      ))}
    </section>
  );
}

/**
 * The first category still to be revealed, skipping aggregates that are waiting for the
 * categories they add up (unless nothing else is left)
 */
const nextToReveal = (categories: Category[]) => {
  const unrevealed = categories.filter(c => !c.revealed);
  return (
    unrevealed.find(
      c =>
        c.type !== "AGGREGATE" ||
        c.sourceCategories.every(source => source.revealed),
    ) ?? unrevealed[0]
  );
};

/**
 * How many people have voted in the category: fetched again on each vote while voting is open
 * (the run view's live events), and final once it has closed
 */
function useLiveVoters(category: Category, isOpen: boolean) {
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.award.getCategory.queryOptions(
      { id: category.id },
      { enabled: isOpen },
    ),
  );
  return data?.estimatedVoters ?? category.estimatedVoters ?? 0;
}

function RevealOption({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={value => onChange(value === true)}
        aria-describedby={`${id}-description`}
      />
      <div className="space-y-1 leading-none">
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-description`} className="text-muted-foreground text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}
