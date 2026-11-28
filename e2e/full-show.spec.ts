import {
  addCategory,
  addNomination,
  categoryCard,
  createShow,
  expect,
  expectResults,
  nextCategory,
  outcome,
  PICTURES,
  rank,
  runShow,
  runStep,
  setRevealOptions,
  test,
  vote,
  waitForCategory,
} from "./show";

const FILMS = ["Dune", "Barbie", "Oppenheimer"];

/**
 * A whole show, as it happens on the night: the host sets it up, three guests vote on their
 * phones, and the big screen shows each result as the host reveals it.
 */
test("a show from setup to the last reveal", async ({ visit }) => {
  const host = await visit();
  const code = await createShow(host, {
    name: "Movie Night Awards",
    password: "popcorn",
  });

  await test.step("the host sets up a category of each type", async () => {
    await addCategory(host, { name: "Best Film", type: "NORMAL" });
    for (const film of FILMS) {
      await addNomination(host, "Best Film", { name: film });
    }

    await addCategory(host, { name: "Best Poster", type: "IMAGE" });
    for (const poster of ["Desert", "Pink", "Bomb"]) {
      await addNomination(host, "Best Poster", {
        name: poster,
        description: `${PICTURES}/${poster.toLowerCase()}.png`,
      });
    }

    await addCategory(host, {
      name: "Top Films",
      type: "RANKING",
      rankingTop: 2,
    });
    for (const film of FILMS) {
      await addNomination(host, "Top Films", { name: film });
    }

    await addCategory(host, {
      name: "Overall",
      type: "AGGREGATE",
      sources: ["Best Film", "Top Films"],
    });
    // It copies its sources' nominations
    const overall = categoryCard(host, "Overall");
    for (const film of FILMS) {
      await expect(overall.getByText(film, { exact: true })).toBeVisible();
    }
  });

  const screen = await visit();
  await screen.goto(`/present/${code}`);
  await expect(screen.getByText("Waiting for the next award.")).toBeVisible();
  await expect(screen.getByText(code, { exact: true })).toBeVisible();

  // The first guest types the room code on the homepage (in lower case); the others scan the QR
  // code, which opens the vote page
  const first = await visit({ phone: true });
  const second = await visit({ phone: true });
  const third = await visit({ phone: true });
  const voters = [first, second, third];
  await first.goto("/");
  await first
    .getByRole("textbox", { name: "Room code from the big screen" })
    .fill(code.toLowerCase());
  await first.getByRole("button", { name: "Join" }).click();
  await first.waitForURL(`/vote/${code}`);
  await second.goto(`/vote/${code}`);
  await third.goto(`/vote/${code}`);
  for (const voter of voters) {
    await expect(voter.getByText("Waiting for the next award.")).toBeVisible();
  }

  // The host runs the show from the run view, one category at a time in the running order
  await runShow(host);

  await test.step("a normal category, where a guest changes their vote", async () => {
    await runStep(host, "Best Film", "Open voting", "Voting");
    for (const voter of voters) await waitForCategory(voter, "Best Film");
    // Guests vote at the same time; the third changes their mind
    await Promise.all([
      vote(first, "Dune"),
      vote(second, "Dune"),
      vote(third, "Barbie").then(() =>
        vote(third, "Oppenheimer", { change: true }),
      ),
    ]);

    // Closing voting before the reveal: phones and the big screen say so, with no results yet
    await runStep(host, "Best Film", "Close voting", "Voting closed");
    for (const voter of voters) {
      await expect(outcome(voter, "Voting has closed")).toBeVisible();
    }
    await expect(screen.getByText("Voting has closed")).toBeVisible();

    await runStep(host, "Best Film", "Reveal the winner", "Revealed");
    await expectResults(screen, "Best Film", [
      ["Dune", "2 votes"],
      ["Oppenheimer", "1 vote"],
      ["Barbie", "0 votes"],
    ]);
    await nextCategory(host, "Best Film", "Best Poster");
  });

  await test.step("an image category", async () => {
    await runStep(host, "Best Poster", "Open voting", "Voting");
    for (const voter of voters) await waitForCategory(voter, "Best Poster");
    await expect(
      first.locator(`img[src="${PICTURES}/pink.png"]`),
    ).toBeVisible();
    await Promise.all([
      vote(first, "Pink"),
      vote(second, "Pink"),
      vote(third, "Desert"),
    ]);

    await runStep(host, "Best Poster", "Close voting", "Voting closed");
    await runStep(host, "Best Poster", "Reveal the winner", "Revealed");
    await expectResults(screen, "Best Poster", [
      ["Pink", "2 votes"],
      ["Desert", "1 vote"],
      ["Bomb", "0 votes"],
    ]);
    await expect(
      screen.locator(`img[src="${PICTURES}/pink.png"]`),
    ).toBeVisible();
    await nextCategory(host, "Best Poster", "Top Films");
  });

  await test.step("a ranking category, where a guest changes their ranking", async () => {
    await runStep(host, "Top Films", "Open voting", "Voting");
    for (const voter of voters) await waitForCategory(voter, "Top Films");
    await Promise.all([
      rank(first, ["Barbie", "Dune"]),
      rank(second, ["Barbie", "Oppenheimer"]),
      rank(third, ["Dune", "Barbie"]).then(() =>
        rank(third, ["Dune", "Oppenheimer"], { change: true }),
      ),
    ]);

    await runStep(host, "Top Films", "Close voting", "Voting closed");
    await runStep(host, "Top Films", "Reveal the winner", "Revealed");
    // 1st place gets 2 points, 2nd gets 1
    await expectResults(screen, "Top Films", [
      ["Barbie", "4 points"],
      ["Dune", "3 points"],
      ["Oppenheimer", "2 points"],
    ]);
    await nextCategory(host, "Top Films", "Overall");
  });

  await test.step("an aggregate category, which takes no votes", async () => {
    // Its sources are all revealed, so it goes straight to the reveal
    await runStep(host, "Overall", "Reveal", "Revealed");
    for (const voter of voters) {
      await waitForCategory(voter, "Overall");
      await expect(voter.getByRole("button", { name: /Vote/ })).toHaveCount(0);
    }

    // Best Film's votes plus Top Films' points
    await expectResults(screen, "Overall", [
      ["Dune", "5 points"],
      ["Barbie", "4 points"],
      ["Oppenheimer", "3 points"],
    ]);
  });

  await test.step("presentation options change the reveal", async () => {
    await setRevealOptions(host, "Overall", { hideVoteCounts: true });
    await expectResults(screen, "Overall", [
      ["Dune", null],
      ["Barbie", null],
      ["Oppenheimer", null],
    ]);

    await setRevealOptions(host, "Overall", { winnerOnly: true });
    await expectResults(screen, "Overall", [["Dune", null]]);

    await setRevealOptions(host, "Overall", { hideVoteCounts: false });
    await expectResults(screen, "Overall", [["Dune", "5 points"]]);
  });
});
