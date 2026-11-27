import {
  addCategory,
  addNomination,
  categoryCard,
  createShow,
  expect,
  expectResults,
  PICTURES,
  presentCategory,
  rank,
  revealCategory,
  setPresentation,
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

  await test.step("a normal category, where a guest changes their vote", async () => {
    await presentCategory(host, "Best Film");
    for (const voter of voters) await waitForCategory(voter, "Best Film");
    // Guests vote at the same time; the third changes their mind
    await Promise.all([
      vote(first, "Dune"),
      vote(second, "Dune"),
      vote(third, "Barbie").then(() => vote(third, "Oppenheimer")),
    ]);

    await revealCategory(host, "Best Film");
    await expectResults(screen, "Best Film", [
      ["Dune", "2 votes"],
      ["Oppenheimer", "1 vote"],
      ["Barbie", "0 votes"],
    ]);
    // Revealing closes voting
    for (const voter of voters) {
      await expect(voter.getByText("Voting has closed")).toBeVisible();
    }
  });

  await test.step("an image category", async () => {
    await presentCategory(host, "Best Poster");
    for (const voter of voters) await waitForCategory(voter, "Best Poster");
    await expect(
      first.locator(`img[src="${PICTURES}/pink.png"]`),
    ).toBeVisible();
    await Promise.all([
      vote(first, "Pink"),
      vote(second, "Pink"),
      vote(third, "Desert"),
    ]);

    await revealCategory(host, "Best Poster");
    await expectResults(screen, "Best Poster", [
      ["Pink", "2 votes"],
      ["Desert", "1 vote"],
      ["Bomb", "0 votes"],
    ]);
    await expect(
      screen.locator(`img[src="${PICTURES}/pink.png"]`),
    ).toBeVisible();
  });

  await test.step("a ranking category, where a guest changes their ranking", async () => {
    await presentCategory(host, "Top Films");
    for (const voter of voters) await waitForCategory(voter, "Top Films");
    await Promise.all([
      rank(first, ["Barbie", "Dune"]),
      rank(second, ["Barbie", "Oppenheimer"]),
      rank(third, ["Dune", "Barbie"]).then(() =>
        rank(third, ["Dune", "Oppenheimer"]),
      ),
    ]);

    await revealCategory(host, "Top Films");
    // 1st place gets 2 points, 2nd gets 1
    await expectResults(screen, "Top Films", [
      ["Barbie", "4 points"],
      ["Dune", "3 points"],
      ["Oppenheimer", "2 points"],
    ]);
  });

  await test.step("an aggregate category, which takes no votes", async () => {
    await presentCategory(host, "Overall");
    for (const voter of voters) {
      await waitForCategory(voter, "Overall");
      await expect(voter.getByText(/Voting is not available/)).toBeVisible();
      await expect(voter.getByRole("button", { name: /Vote/ })).toHaveCount(0);
    }

    await revealCategory(host, "Overall");
    // Best Film's votes plus Top Films' points
    await expectResults(screen, "Overall", [
      ["Dune", "5 points"],
      ["Barbie", "4 points"],
      ["Oppenheimer", "3 points"],
    ]);
  });

  await test.step("presentation options change the reveal", async () => {
    await setPresentation(host, "Overall", { hideVoteCounts: true });
    await expectResults(screen, "Overall", [
      ["Dune", null],
      ["Barbie", null],
      ["Oppenheimer", null],
    ]);

    await setPresentation(host, "Overall", { winnerOnly: true });
    await expectResults(screen, "Overall", [["Dune", null]]);

    await setPresentation(host, "Overall", { hideVoteCounts: false });
    await expectResults(screen, "Overall", [["Dune", "5 points"]]);
  });
});
