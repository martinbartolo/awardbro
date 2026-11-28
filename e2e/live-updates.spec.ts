import { type Page } from "@playwright/test";

import {
  addCategory,
  addNomination,
  createShow,
  expect,
  expectResults,
  runShow,
  runStep,
  test,
  vote,
  waitForCategory,
} from "./show";

/**
 * Pages fetch the show anyway every 30 seconds (FALLBACK_REFETCH_MS). Anything they show well
 * before that came from a live event.
 */
const LIVE = { timeout: 5_000 };

/** The live count of votes on the big screen */
const totalVotes = (screen: Page) =>
  screen.getByRole("status", { name: "Total votes" });

/**
 * A show with one normal category, with the big screen and a voter's phone on it. With
 * `screenOffline`, the big screen can't get live events until the test lets it.
 */
async function openShow(
  visit: (v?: { phone?: boolean }) => Promise<Page>,
  { screenOffline = false } = {},
) {
  const host = await visit();
  const code = await createShow(host, {
    name: "Live Awards",
    password: "live",
  });
  await addCategory(host, { name: "Best Film", type: "NORMAL" });
  for (const film of ["Dune", "Barbie"]) {
    await addNomination(host, "Best Film", { name: film });
  }
  await runShow(host);

  const screen = await visit();
  if (screenOffline) {
    await screen.route("**/api/shows/*/events", route => route.abort());
  }
  await screen.goto(`/present/${code}`);
  await expect(screen.getByText("Waiting for the next award.")).toBeVisible();
  const voter = await visit({ phone: true });
  await voter.goto(`/vote/${code}`);
  await expect(voter.getByText("Waiting for the next award.")).toBeVisible();

  return { host, screen, voter };
}

test("the big screen and phones follow the show as it happens", async ({
  visit,
}) => {
  const { host, screen, voter } = await openShow(visit);

  await runStep(host, "Best Film", "Open voting", "Voting");
  await waitForCategory(screen, "Best Film", LIVE);
  await waitForCategory(voter, "Best Film", LIVE);
  await expect(totalVotes(screen)).toHaveText("0");

  await vote(voter, "Dune");
  await expect(totalVotes(screen)).toHaveText("1", LIVE);

  await runStep(host, "Best Film", "Close voting", "Voting closed");
  await expect(voter.getByText("Voting has closed")).toBeVisible(LIVE);
  await runStep(host, "Best Film", "Reveal the winner", "Revealed");
  await expectResults(
    screen,
    "Best Film",
    [
      ["Dune", "1 vote"],
      ["Barbie", "0 votes"],
    ],
    LIVE,
  );
});

test("the big screen catches up with what it missed while it couldn't listen", async ({
  visit,
}) => {
  const { host, screen, voter } = await openShow(visit, {
    screenOffline: true,
  });
  // The host's run view and the phone still get live events
  await runStep(host, "Best Film", "Open voting", "Voting");
  await waitForCategory(voter, "Best Film");
  await vote(voter, "Dune");
  // Long enough for a live event to have shown up, well short of the 30-second fallback
  await screen.waitForTimeout(3_000);
  await expect(screen.getByText("Waiting for the next award.")).toBeVisible();

  // It can connect again (`EventSource` keeps trying), and fetches what changed meanwhile
  await screen.unroute("**/api/shows/*/events");
  await waitForCategory(screen, "Best Film", { timeout: 15_000 });
  await expect(totalVotes(screen)).toHaveText("1");
});
