import { listFormat } from "~/lib/utils";

/**
 * The stages a category goes through during the show. The server stores three flags: `isActive`
 * (on the big screen), `votingClosed` and `revealed`. The host moves a category between stages
 * with `setCategoryStage`, and this file maps between the two.
 */

/** The flags that make up a category's stage */
type StageFlags = {
  isActive: boolean;
  votingClosed: boolean;
  revealed: boolean;
};

/** The stages the host sets: on the big screen voting, closed or revealed, or off it */
export const SERVER_STAGES = ["off", "open", "closed", "revealed"] as const;
export type ServerStage = (typeof SERVER_STAGES)[number];

/**
 * What each stage sets. Every stage sets the whole state, so repeating a click never flips it the
 * wrong way. Off the big screen, a category stays closed or revealed if it was.
 */
export const STAGE_FLAGS: Record<ServerStage, Partial<StageFlags>> = {
  off: { isActive: false },
  open: { isActive: true, votingClosed: false, revealed: false },
  closed: { isActive: true, votingClosed: true, revealed: false },
  revealed: { isActive: true, votingClosed: true, revealed: true },
};

/**
 * Whether voting has closed: the host closed it, or revealed the results. (A category revealed
 * by code from before `votingClosed` existed has only `revealed` set.)
 */
export const votingHasClosed = (category: StageFlags) =>
  category.votingClosed || category.revealed;

/** Where a category is in the show, as the host sees it */
export const STAGES = ["ready", "open", "closed", "revealed", "done"] as const;
export type Stage = (typeof STAGES)[number];

/**
 * A category's stage from its flags: still to come (ready), voting (on the big screen), closed
 * (on the screen or taken off it before the reveal), revealed (on the screen) or done (revealed,
 * and off the screen).
 */
export const stageOf = (category: StageFlags): Stage =>
  category.revealed
    ? category.isActive
      ? "revealed"
      : "done"
    : category.votingClosed
      ? "closed"
      : category.isActive
        ? "open"
        : "ready";

export const STAGE_LABELS: Record<Stage, string> = {
  ready: "Not started",
  open: "Voting",
  closed: "Voting closed",
  revealed: "Revealed",
  done: "Done",
};

/** A button in the run view: its label and the stage it moves the category to */
export type Step = { label: string; stage: ServerStage; disabled?: boolean };

/**
 * The steps the run view offers for the category it's on: the one to take now (`primary`), the
 * other ones, notes for the host, and whether to show the reveal options (hide vote counts,
 * winner only). An aggregate takes no votes, so it goes straight to the reveal once the categories
 * it adds up are revealed.
 */
export function stepsFor({
  stage,
  isAggregate,
  voters,
  next,
  unrevealedSources,
  onScreen,
}: {
  stage: Stage;
  isAggregate: boolean;
  /** How many people have voted in it */
  voters: number;
  /** The next category still to be revealed, if any */
  next?: string;
  /** For an aggregate: the categories it adds up that aren't revealed yet */
  unrevealedSources: string[];
  /** Another category on the big screen, which this one would replace */
  onScreen?: string;
}): {
  primary: Step | null;
  others: Step[];
  notes: string[];
  showOptions: boolean;
} {
  // Only a category off the big screen has another one on it
  const replaces = onScreen
    ? [`This takes ${onScreen} off the big screen.`]
    : [];

  if (stage === "revealed") {
    return {
      primary: next ? { label: `Next: ${next}`, stage: "off" } : null,
      others: [
        { label: "Hide the results", stage: "closed" },
        ...(next
          ? []
          : [{ label: "Take off the big screen", stage: "off" } as Step]),
      ],
      notes: next ? [] : ["That was the last category."],
      showOptions: true,
    };
  }
  if (stage === "done") {
    return {
      primary: { label: "Show the results again", stage: "revealed" },
      others: [],
      notes: replaces,
      showOptions: false,
    };
  }
  if (isAggregate) {
    const waiting = unrevealedSources.length > 0;
    return {
      primary: { label: "Reveal", stage: "revealed", disabled: waiting },
      others: [],
      notes: [
        ...(waiting
          ? [
              `Reveal ${listFormat.format(unrevealedSources)} first: this adds up their results.`,
            ]
          : []),
        ...replaces,
      ],
      showOptions: true,
    };
  }
  if (stage === "ready") {
    return {
      primary: { label: "Open voting", stage: "open" },
      others: [],
      notes: replaces,
      showOptions: false,
    };
  }
  if (stage === "open") {
    return {
      primary: { label: "Close voting", stage: "closed" },
      others: [{ label: "Take off the big screen", stage: "off" }],
      notes: [],
      showOptions: false,
    };
  }
  return {
    primary: { label: "Reveal the winner", stage: "revealed" },
    others: [{ label: "Reopen voting", stage: "open" }],
    notes: [...(voters === 0 ? ["Nobody has voted yet."] : []), ...replaces],
    showOptions: true,
  };
}

/**
 * The categories as they'll be once one moves to a stage, as the server does it: the stage's
 * flags (`STAGE_FLAGS`), and any other category leaves the big screen when this one goes on it.
 * For showing a step straight away, before the server confirms it.
 */
export const applyStage = <C extends StageFlags & { id: string }>(
  categories: C[],
  id: string,
  stage: ServerStage,
): C[] => {
  const flags = STAGE_FLAGS[stage];
  return categories.map(category =>
    category.id === id
      ? { ...category, ...flags }
      : flags.isActive && category.isActive
        ? { ...category, isActive: false }
        : category,
  );
};
