import { type Page } from "@playwright/test";

import {
  addCategory,
  addNomination,
  categoryCard,
  createShow,
  currentCategory,
  expect,
  runShow,
  runStep,
  test,
  vote,
  voteIsIn,
  waitForCategory,
} from "./show";

/** Far longer than the screen may take to show an action, which it does before the server answers */
const SLOW_SERVER_MS = 4_000;
const STRAIGHT_AWAY = { timeout: 1_500 };

/**
 * Makes the server's answers to one action (a tRPC procedure) arrive late, or fail late as if
 * the network dropped. Returns a way to wait for the (late) answer, and the function that stops it.
 */
async function interfere(page: Page, procedure: string, how: "slow" | "fail") {
  const pattern = `**/api/trpc/**${procedure}**`;
  await page.route(pattern, async route => {
    await new Promise(resolve => setTimeout(resolve, SLOW_SERVER_MS));
    await (how === "fail" ? route.abort() : route.continue());
  });
  return {
    // Late answers arrive well after the screen has shown the action, so waiting can start then
    answered: () =>
      page.waitForResponse(response => response.url().includes(procedure)),
    stop: () => page.unroute(pattern),
  };
}

async function showWithCategory(visit: () => Promise<Page>) {
  const host = await visit();
  const code = await createShow(host, {
    name: "Instant Awards",
    password: "instant",
  });
  await addCategory(host, { name: "Best Film", type: "NORMAL" });
  for (const film of ["Dune", "Barbie"]) {
    await addNomination(host, "Best Film", { name: film });
  }
  await runShow(host);
  return { host, code };
}

test("the host's steps show straight away, and go back if they fail", async ({
  visit,
}) => {
  const { host } = await showWithCategory(visit);

  const slow = await interfere(host, "setCategoryStage", "slow");
  await runStep(host, "Best Film", "Open voting", "Voting", STRAIGHT_AWAY);
  // And it stays that way once the server has answered
  await slow.answered();
  const category = currentCategory(host, "Best Film");
  await expect(category.getByText("Voting", { exact: true })).toBeVisible();
  await slow.stop();

  await interfere(host, "setCategoryStage", "fail");
  await category.getByRole("button", { name: "Close voting" }).click();
  await expect(
    category.getByText("Voting closed", { exact: true }),
  ).toBeVisible(STRAIGHT_AWAY);
  // Back to where it really is once the step fails
  await expect(category.getByText("Voting", { exact: true })).toBeVisible();
  await expect(
    category.getByRole("button", { name: "Close voting" }),
  ).toBeEnabled();
});

test("a vote shows as cast straight away, and goes back to the choice if it fails", async ({
  visit,
}) => {
  const { host, code } = await showWithCategory(visit);
  await runStep(host, "Best Film", "Open voting", "Voting");
  const voter = await visit();
  await voter.goto(`/vote/${code}`);
  await waitForCategory(voter, "Best Film");

  const slow = await interfere(voter, "award.vote", "slow");
  await vote(voter, "Dune", { ...STRAIGHT_AWAY, waitForServer: false });
  await slow.answered();
  await slow.stop();

  await interfere(voter, "award.vote", "fail");
  await voter.getByRole("button", { name: "Change my vote" }).click();
  await voter.getByRole("radio", { name: /^Barbie/ }).click();
  await voter.getByRole("button", { name: "Vote for Barbie" }).click();
  await expect(voteIsIn(voter)).toContainText(
    "You voted for Barbie.",
    STRAIGHT_AWAY,
  );
  // Told why, back on Barbie but not saved, ready to try again
  await expect(voter.getByText(/didn't go in|Failed to fetch/)).toBeVisible();
  await expect(voter.getByRole("radio", { name: /^Barbie/ })).toBeChecked();
  await expect(
    voter.getByRole("button", { name: "Vote for Barbie" }),
  ).toBeEnabled();
});

test("the manage page shows the host's changes straight away", async ({
  visit,
}) => {
  const host = await visit();
  await createShow(host, { name: "Setup Awards", password: "setup" });
  await addCategory(host, { name: "Best Film", type: "NORMAL" });
  await addNomination(host, "Best Film", { name: "Dune" });
  const card = categoryCard(host, "Best Film");

  // A new nomination shows as being added, then as saved
  const slowAdd = await interfere(host, "addNomination", "slow");
  await card.getByLabel("Nomination Name").fill("Barbie");
  await card.getByRole("button", { name: "Add nomination" }).click();
  await expect(card.getByText("Barbie", { exact: true })).toBeVisible(
    STRAIGHT_AWAY,
  );
  const barbie = card.getByRole("listitem").filter({ hasText: "Barbie" });
  await expect(barbie.getByText("Adding...")).toBeVisible();
  await slowAdd.answered();
  await expect(barbie.getByText("Adding...")).toBeHidden();
  await slowAdd.stop();

  // A deleted nomination goes straight away
  await interfere(host, "deleteNomination", "slow");
  const dune = card.getByRole("listitem").filter({ hasText: "Dune" });
  await dune.getByRole("button", { name: "Delete nomination" }).click();
  await host.getByRole("button", { name: "Delete Nomination" }).click();
  await expect(card.getByText("Dune", { exact: true })).toBeHidden(
    STRAIGHT_AWAY,
  );
});
