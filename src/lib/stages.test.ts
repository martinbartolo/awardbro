import { describe, expect, it } from "vitest";

import { applyStage, isWaiting, stageLabel, stageOf, stepsFor } from "./stages";

describe("stageOf", () => {
  it.each([
    [{ isActive: false, votingClosed: false, revealed: false }, "ready"],
    [{ isActive: true, votingClosed: false, revealed: false }, "open"],
    [{ isActive: true, votingClosed: true, revealed: false }, "closed"],
    [{ isActive: true, votingClosed: true, revealed: true }, "revealed"],
    [{ isActive: false, votingClosed: true, revealed: true }, "done"],
    // Closed, then taken off the big screen: still closed, ready to reveal
    [{ isActive: false, votingClosed: true, revealed: false }, "closed"],
    // Revealed by code from before votingClosed existed
    [{ isActive: true, votingClosed: false, revealed: true }, "revealed"],
  ])("%o is %s", (state, stage) => {
    expect(stageOf(state)).toBe(stage);
  });
});

describe("stepsFor", () => {
  const base = {
    isAggregate: false,
    voters: 3,
    next: "Best Poster",
    unrevealedSources: [],
  };
  const labels = (steps: ReturnType<typeof stepsFor>) => ({
    primary: steps.primary?.label,
    others: steps.others.map(step => step.label),
  });

  it("goes open voting, close voting, reveal, next", () => {
    expect(labels(stepsFor({ ...base, stage: "ready" }))).toEqual({
      primary: "Open voting",
      others: [],
    });
    expect(labels(stepsFor({ ...base, stage: "open" }))).toEqual({
      primary: "Close voting",
      others: ["Take off the big screen"],
    });
    expect(labels(stepsFor({ ...base, stage: "closed" }))).toEqual({
      primary: "Reveal the winner",
      others: ["Reopen voting"],
    });
    expect(stepsFor({ ...base, stage: "revealed" })).toMatchObject({
      primary: { label: "Next: Best Poster", stage: "off" },
      others: [{ label: "Hide the results", stage: "closed" }],
    });
  });

  it("offers the reveal options from closing voting on", () => {
    expect(stepsFor({ ...base, stage: "open" }).showOptions).toBe(false);
    expect(stepsFor({ ...base, stage: "closed" }).showOptions).toBe(true);
    expect(stepsFor({ ...base, stage: "revealed" }).showOptions).toBe(true);
  });

  it("says when nobody has voted, but still lets the host reveal", () => {
    const steps = stepsFor({ ...base, stage: "closed", voters: 0 });
    expect(steps.notes).toEqual(["Nobody has voted yet."]);
    expect(steps.primary?.disabled).toBeUndefined();
  });

  it("ends with the last category, which can leave the big screen", () => {
    const steps = stepsFor({ ...base, stage: "revealed", next: undefined });
    expect(steps.primary).toBeNull();
    expect(steps.notes).toEqual(["That was the last category."]);
    expect(labels(steps).others).toEqual([
      "Hide the results",
      "Take off the big screen",
    ]);
  });

  it("takes an aggregate straight to the reveal, once its sources are revealed", () => {
    const waiting = stepsFor({
      ...base,
      stage: "ready",
      isAggregate: true,
      unrevealedSources: ["Best Film", "Top Films"],
    });
    expect(waiting.primary).toEqual({
      label: "Reveal",
      stage: "revealed",
      disabled: true,
    });
    expect(waiting.notes).toEqual([
      "Reveal Best Film and Top Films first: this adds up their results.",
    ]);

    const ready = stepsFor({ ...base, stage: "ready", isAggregate: true });
    expect(ready.primary).toEqual({
      label: "Reveal",
      stage: "revealed",
      disabled: false,
    });
  });

  it("warns that opening a category takes another off the big screen", () => {
    expect(
      stepsFor({ ...base, stage: "ready", onScreen: "Best Film" }).notes,
    ).toEqual(["This takes Best Film off the big screen."]);
  });
});

describe("applyStage", () => {
  const ready = { isActive: false, votingClosed: false, revealed: false };
  const onScreen = { isActive: true, votingClosed: true, revealed: true };
  const categories = [
    { id: "a", name: "A", ...onScreen },
    { id: "b", name: "B", ...ready },
    { id: "c", name: "C", ...ready },
  ];

  it("opens a category and takes the one on the big screen off it", () => {
    const after = applyStage(categories, "b", "open");

    expect(after.map(stageOf)).toEqual(["done", "open", "ready"]);
    // Everything else stays as it was
    expect(after[0]?.name).toBe("A");
    expect(after[2]).toBe(categories[2]);
  });

  it.each(["closed", "revealed"] as const)(
    "moves the category on the screen to %s",
    stage => {
      const open = applyStage(categories, "b", "open");

      expect(applyStage(open, "b", stage).map(stageOf)).toEqual([
        "done",
        stage,
        "ready",
      ]);
    },
  );

  it("takes a category off the big screen, keeping it revealed", () => {
    expect(applyStage(categories, "a", "off").map(stageOf)).toEqual([
      "done",
      "ready",
      "ready",
    ]);
  });

  it("returns a new list, leaving the one it was given alone", () => {
    applyStage(categories, "b", "open");

    expect(categories.map(stageOf)).toEqual(["revealed", "ready", "ready"]);
  });
});

describe("stageLabel", () => {
  const flags = { isActive: false, votingClosed: false, revealed: false };
  const aggregate = (...sources: boolean[]) => ({
    ...flags,
    type: "AGGREGATE",
    sourceCategories: sources.map(revealed => ({ revealed })),
  });

  it("says an aggregate waits while any category it adds up isn't revealed", () => {
    expect(stageLabel(aggregate(true, false))).toBe("Waits for its awards");
    expect(isWaiting(aggregate(true, false))).toBe(true);
  });

  it("gives the stage once they're all revealed, and for any other category", () => {
    expect(stageLabel(aggregate(true, true))).toBe("Not started");
    expect(
      stageLabel({ ...aggregate(false), revealed: true, isActive: true }),
    ).toBe("Revealed");
    expect(
      stageLabel({
        ...flags,
        isActive: true,
        type: "NORMAL",
        sourceCategories: [],
      }),
    ).toBe("Voting");
  });
});
