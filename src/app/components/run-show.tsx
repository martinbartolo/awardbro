"use client";

import { useState } from "react";

import { ArrowLeftIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { CategoryTypeBadge } from "~/app/components/category-fields";
import { ShapeMark, ShapeMarks } from "~/app/components/shape-marks";
import { ThemeToggle } from "~/app/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { useHostShow } from "~/lib/hooks/useHostShow";
import { useShowChange } from "~/lib/hooks/useShowChange";
import { showPaths } from "~/lib/join";
import { updateCategory } from "~/lib/show-changes";
import {
  applyStage,
  isWaiting,
  type ServerStage,
  type Stage,
  STAGE_LABELS,
  stageLabel,
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
 * close it, reveal the winner, then on to the next. One main button takes the next step. Two
 * columns on a laptop (the category, and the running order beside it), one on a phone, so the
 * host can run the show from beside the big screen.
 */
export function RunShow({
  code,
  initialSession,
}: {
  code: string;
  initialSession: Session;
}) {
  const trpc = useTRPC();
  // Changes made on another device, and each vote for the live count (useLiveVoters)
  const session = useHostShow(code, initialSession, { liveCounts: true });
  const { categories } = session;

  // The category the host picked from the running order, if any
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Otherwise the one on the big screen, or the next one to reveal
  const current =
    categories.find(c => c.id === selectedId) ??
    categories.find(c => c.isActive) ??
    nextToReveal(categories);

  const showChange = useShowChange();
  const setStage = useMutation(
    trpc.award.setCategoryStage.mutationOptions(
      showChange(
        (categories, { id, stage }: { id: string; stage: ServerStage }) =>
          applyStage(categories, id, stage),
      ),
    ),
  );
  const setOptions = useMutation(
    trpc.award.setRevealOptions.mutationOptions(
      showChange(
        (categories, { id, ...options }: { id: string } & RevealOptions) =>
          updateCategory(categories, id, c => ({ ...c, ...options })),
      ),
    ),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
      {/* On a phone the links go under the show's name, so the name is never cut short */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-balance">{session.name}</h1>
          <p className="text-muted-foreground text-sm">
            Running the show · Room{" "}
            <span className="text-foreground font-bold tracking-wide">
              {code}
            </span>
          </p>
        </div>
        <nav className="-ml-3 flex items-center gap-1 sm:ml-0">
          <Button asChild variant="ghost" size="sm">
            <Link href={showPaths.manage(code)}>
              <ArrowLeftIcon />
              Setup
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={showPaths.present(code)} target="_blank">
              Big screen
              <ArrowSquareOutIcon />
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </header>

      <div className="mt-5 grid gap-5 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        {categories.length === 0 ? (
          <QuietPanel title="No awards yet" className="lg:col-span-2">
            Add the show&apos;s categories on the setup page.
          </QuietPanel>
        ) : current ? (
          <CurrentCategory
            key={current.id}
            category={current}
            categories={categories}
            isBusy={setStage.isPending || setOptions.isPending}
            onStage={stage => {
              // On to whatever is on the big screen next (or the next to reveal), or back to the
              // category the host picked if the step fails
              const picked = selectedId;
              setSelectedId(null);
              setStage.mutate(
                {
                  id: current.id,
                  stage,
                  // So a step from an out-of-date page is refused, not undone
                  from: stageOf(current),
                },
                { onError: () => setSelectedId(picked) },
              );
            }}
            onOptions={options =>
              setOptions.mutate({ id: current.id, ...options })
            }
          />
        ) : (
          <QuietPanel title="That's the show!">
            Every category has been revealed.
          </QuietPanel>
        )}

        {categories.length > 0 && (
          <aside
            aria-labelledby="running-order"
            className="bg-muted rounded-panel self-start p-3 sm:p-4"
          >
            <h2
              id="running-order"
              className="text-muted-foreground px-2 pt-1 pb-2 text-sm font-semibold"
            >
              Running order
            </h2>
            <ol className="space-y-1">
              {categories.map((category, index) => {
                const isCurrent = category.id === current?.id;
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(category.id)}
                      aria-current={isCurrent ? "step" : undefined}
                      className={cn(
                        "focus-visible:ring-ring rounded-inner flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                        isCurrent ? "bg-card shadow-soft" : "hover:bg-card/60",
                      )}
                    >
                      <ShapeMark index={index} />
                      <span
                        className={cn(
                          "min-w-0 flex-1 leading-snug",
                          isCurrent ? "font-semibold" : "font-medium",
                        )}
                      >
                        {category.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-xs",
                          isCurrent
                            ? "text-primary font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        {stageLabel(category)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}

/** What each stage means for the host, and what the next step does */
const HINTS: Record<Stage, string> = {
  ready:
    "Open voting to put it on the big screen. Phones show its nominations straight away.",
  open: "Votes are coming in. When the room has had its say, close voting to build the suspense.",
  closed:
    "Voting is closed. Choose how the results show, then reveal the winner.",
  revealed: "The results are on the big screen.",
  done: "This one's done. You can show its results again.",
};

/** The stages a category goes through, as the stepper shows them */
const VOTING_STAGES: Stage[] = ["ready", "open", "closed", "revealed"];
const AGGREGATE_STAGES: Stage[] = ["ready", "revealed"];

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
  // A category that's done shows as revealed in the stepper, and an aggregate's hidden results
  // (it has no voting to close) as not revealed yet
  const shownStage =
    stage === "done"
      ? "revealed"
      : isAggregate && stage === "closed"
        ? "ready"
        : stage;
  const stages = isAggregate ? AGGREGATE_STAGES : VOTING_STAGES;
  const stepIndex = stages.indexOf(shownStage);

  return (
    <section
      aria-labelledby="current-category"
      className="bg-card rounded-panel flex flex-col p-5 sm:p-7 lg:min-h-[32rem] lg:p-9"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2
          id="current-category"
          className="text-3xl leading-tight font-bold text-balance lg:text-4xl"
        >
          {category.name}
        </h2>
        <CategoryTypeBadge
          type={category.type}
          rankingTop={category.rankingTop}
        />
      </div>
      <p className="text-muted-foreground mt-2 font-medium">
        Award {categories.indexOf(category) + 1} of {categories.length}
      </p>

      {/* Where the category is: the step it's on in the action colour */}
      <ol
        aria-label="Stages"
        className={cn(
          "mt-5 grid gap-2",
          "grid-cols-2",
          !isAggregate && "sm:grid-cols-4",
        )}
      >
        {stages.map((step, index) => (
          <li
            key={step}
            aria-current={index === stepIndex ? "step" : undefined}
            className={cn(
              "rounded-inner px-3 py-2.5 text-center text-sm font-semibold",
              index === stepIndex
                ? "bg-primary/15 text-primary ring-primary/50 ring-2 ring-inset"
                : index < stepIndex
                  ? "bg-muted text-foreground"
                  : "bg-muted/60 text-muted-foreground",
            )}
          >
            {STAGE_LABELS[step]}
          </li>
        ))}
      </ol>

      {isVoting && (
        <div
          className="bg-muted rounded-inner mt-5 flex flex-wrap items-baseline gap-x-3 px-6 py-5"
          aria-live="polite"
          aria-atomic
        >
          <span className="text-6xl leading-none font-bold tabular-nums">
            {voters}
          </span>
          <span className="text-muted-foreground text-lg">
            {voters === 1 ? "person has" : "people have"} voted
          </span>
        </div>
      )}

      <p className="text-muted-foreground mt-5 max-w-prose text-lg leading-snug">
        {isAggregate && stage === "ready"
          ? "This adds up earlier awards, so there's no voting: reveal it once they're all revealed."
          : isAggregate && stage === "closed"
            ? "The results are hidden. Reveal them again when you're ready."
            : HINTS[stage]}
      </p>
      {notes.map(note => (
        <p key={note} className="text-foreground mt-2 max-w-prose">
          {note}
        </p>
      ))}

      {showOptions && (
        <fieldset className="mt-5 space-y-3">
          <legend className="mb-3 font-semibold">The reveal shows</legend>
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
            <p className="text-muted-foreground text-sm">
              The options of the categories it adds up apply too.
            </p>
          )}
        </fieldset>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:mt-auto lg:pt-8">
        {primary && (
          <Button
            size="pillLg"
            className="shadow-lift"
            disabled={isBusy || primary.disabled}
            onClick={() => onStage(primary.stage)}
          >
            {primary.label}
          </Button>
        )}
        {others.map(step => (
          <Button
            key={step.label}
            variant="quiet"
            size="pillLg"
            className="text-base font-semibold"
            disabled={isBusy}
            onClick={() => onStage(step.stage)}
          >
            {step.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

/**
 * The first category still to be revealed, skipping aggregates that are waiting for the
 * categories they add up (unless nothing else is left)
 */
const nextToReveal = (categories: Category[]) => {
  const unrevealed = categories.filter(c => !c.revealed);
  return unrevealed.find(c => !isWaiting(c)) ?? unrevealed[0];
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
    <div className="bg-muted rounded-inner flex items-start gap-3 px-4 py-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={value => onChange(value === true)}
        aria-describedby={`${id}-description`}
        className="mt-0.5"
      />
      <div className="space-y-1 leading-none">
        <Label htmlFor={id} className="text-base">
          {label}
        </Label>
        <p id={`${id}-description`} className="text-muted-foreground text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}

/** A card with the shape set, for the run view's start and end: no awards yet, or the show done */
function QuietPanel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "bg-card rounded-panel flex flex-col items-center px-6 py-16 text-center",
        className,
      )}
    >
      <ShapeMarks className="mb-5" />
      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="text-muted-foreground mt-2">{children}</p>
    </section>
  );
}
