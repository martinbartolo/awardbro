import {
  test as base,
  type BrowserContext,
  expect,
  type Page,
} from "@playwright/test";

/**
 * Helpers that act as a host, a voter or the big screen, through the pages as people use them.
 * Locators go by roles, labels and visible text, so the tests keep working when the look changes.
 */

/** Pictures for image categories. Every browser in the tests gets them from `servePictures`. */
export const PICTURES = "https://pictures.e2e.test";

// A 1×1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const servePictures = (context: BrowserContext) =>
  context.route(`${PICTURES}/**`, route =>
    route.fulfill({ contentType: "image/png", body: PNG }),
  );

type Visitor = { phone?: boolean };

/**
 * `visit()` opens a page in a browser of its own, as another person would: a host, a voter on a
 * phone (`{ phone: true }`), or the big screen. They share no cookies.
 */
export const test = base.extend<{
  visit: (visitor?: Visitor) => Promise<Page>;
}>({
  visit: async ({ browser, baseURL, playwright }, provide) => {
    const contexts: BrowserContext[] = [];
    await provide(async ({ phone = false } = {}) => {
      const device = phone ? playwright.devices["Pixel 7"] : {};
      const context = await browser.newContext({ ...device, baseURL });
      await servePictures(context);
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map(context => context.close()));
  },
});

export { expect };

/** Creates a show from the create page, and returns its room code. The host lands on its manage page. */
export async function createShow(
  host: Page,
  { name, password }: { name: string; password: string },
) {
  await host.goto("/create");
  await host.getByLabel("Name", { exact: true }).fill(name);
  await host.getByLabel("Password", { exact: true }).fill(password);
  await host.getByRole("button", { name: "Create Award Show" }).click();
  await host.waitForURL(/\/manage\/[A-Z0-9]{4}$/);
  await expect(host.getByRole("heading", { name, level: 1 })).toBeVisible();
  return host.url().split("/").pop()!;
}

const TYPE_LABELS = {
  NORMAL: "Normal",
  IMAGE: "Image",
  RANKING: "Ranking",
  AGGREGATE: "Aggregate",
} as const;

/** A category's card on the manage page */
export const categoryCard = (host: Page, name: string) =>
  host.getByRole("region", { name, exact: true });

export async function addCategory(
  host: Page,
  {
    name,
    type,
    rankingTop,
    sources = [],
  }: {
    name: string;
    type: keyof typeof TYPE_LABELS;
    rankingTop?: number;
    /** An aggregate's source categories */
    sources?: string[];
  },
) {
  await host.getByRole("button", { name: "Add category" }).click();
  const form = host.getByRole("region", { name: "Add category" });
  // Each type is a card to click, with a radio button named after the type
  const choice = form.getByRole("radio", {
    name: TYPE_LABELS[type],
    exact: true,
  });
  await form.getByText(TYPE_LABELS[type], { exact: true }).click();
  await expect(choice).toBeChecked();
  if (rankingTop) {
    await form.getByLabel("How many to rank?").fill(String(rankingTop));
  }
  await form.getByLabel("Category Name").fill(name);
  for (const source of sources) {
    await form.getByRole("checkbox", { name: source, exact: true }).check();
  }
  await form.getByRole("button", { name: "Add category" }).click();
  await expect(categoryCard(host, name)).toBeVisible();
}

/**
 * Adds a nomination to a category. In an image category `description` is the picture's link, and
 * the form saves only once its preview has loaded. The form stays open for the next one, and is
 * already open for a category the host just added.
 */
export async function addNomination(
  host: Page,
  category: string,
  { name, description }: { name: string; description?: string },
) {
  const card = categoryCard(host, category);
  const nameField = card.getByLabel(/^(Nomination Name|Image Caption)$/);
  if (!(await nameField.isVisible())) {
    await card.getByRole("button", { name: "Add nomination" }).click();
  }
  await nameField.fill(name);
  if (description) {
    await card
      .getByLabel(/^(Description \(Optional\)|Picture Link)$/)
      .fill(description);
    if ((await card.getByLabel("Picture Link").count()) > 0) {
      await expect(card.getByAltText("Preview")).toBeVisible();
    }
  }
  await card.getByRole("button", { name: "Add nomination" }).click();
  await expect(card.getByText(name, { exact: true })).toBeVisible();
  // It shows straight away, as "Adding...", until the server has saved it
  await expect(card.getByText("Adding...")).toHaveCount(0);
}

/** The host opens the run view from the manage page */
export async function runShow(host: Page) {
  await host.getByRole("link", { name: "Run the Show" }).click();
  await expect(
    host.getByRole("heading", { name: "Running order" }),
  ).toBeVisible();
}

/** The category the run view is on: its stage and the buttons for its next step */
export const currentCategory = (host: Page, category: string) =>
  host.getByRole("region", { name: category, exact: true });

/**
 * The host takes a step of the show in the run view, for the category it's on: the button's name,
 * and the stage the category is in afterwards ("Voting", "Voting closed", "Revealed")
 */
export async function runStep(
  host: Page,
  category: string,
  button: string,
  stage: string,
  options?: { timeout?: number },
) {
  const current = currentCategory(host, category);
  await current.getByRole("button", { name: button, exact: true }).click();
  await expect(current.getByText(stage, { exact: true })).toBeVisible(options);
}

/** The host moves on from a revealed category to the next one */
export async function nextCategory(host: Page, from: string, to: string) {
  await currentCategory(host, from)
    .getByRole("button", { name: `Next: ${to}` })
    .click();
  await expect(currentCategory(host, to)).toBeVisible();
}

/**
 * The host sets how the category's reveal shows it, in the run view. Options left out stay as
 * they are.
 */
export async function setRevealOptions(
  host: Page,
  category: string,
  options: { hideVoteCounts?: boolean; winnerOnly?: boolean },
) {
  const labels = {
    hideVoteCounts: "Hide vote counts",
    winnerOnly: "Winner only",
  };
  for (const [option, checked] of Object.entries(options)) {
    const box = currentCategory(host, category).getByRole("checkbox", {
      name: labels[option as keyof typeof labels],
    });
    if ((await box.isChecked()) !== checked) await box.click();
    // Saved once the run view shows the server's value
    await expect(box).toBeChecked({ checked });
  }
}

/** A voter (or the big screen) waits for the host to present a category */
export async function waitForCategory(
  page: Page,
  category: string,
  options?: { timeout?: number },
) {
  await expect(page.getByText(category, { exact: true })).toBeVisible(options);
}

/** Text as a regular expression that matches it literally */
const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A nomination to choose on the vote page, by its name (its description or "(Ranked 1st)" may follow) */
const nominationButton = (voter: Page, name: string) =>
  voter.getByRole("button", {
    name: new RegExp(`^${literal(name)}(?=$|\\s|\\()`),
  });

/**
 * A voter votes (or changes their vote) in a normal or image category, and waits until the
 * server has saved it. With `waitForServer: false`, only until the page shows it.
 */
export async function vote(
  voter: Page,
  nomination: string,
  {
    waitForServer = true,
    ...options
  }: { timeout?: number; waitForServer?: boolean } = {},
) {
  await nominationButton(voter, nomination).click();
  // The page shows the vote as cast before the server answers, so wait for the call itself:
  // a host action straight after it could otherwise reach the server first (tRPC batches
  // calls, so it's found by name in the address)
  const saved = waitForServer
    ? voter.waitForResponse(
        response => response.url().includes("award.vote") && response.ok(),
      )
    : undefined;
  await voter.getByRole("button", { name: /^(Cast|Update) Vote$/ }).click();
  await expect(voter.getByText("(Submitted)").locator("..")).toContainText(
    nomination,
    options,
  );
  await saved;
}

/** A voter ranks nominations, best first, replacing any ranking they had */
export async function rank(voter: Page, nominations: string[]) {
  const remove = voter.getByRole("button", { name: /^Remove / });
  while ((await remove.count()) > 0) await remove.first().click();
  for (const nomination of nominations) {
    await nominationButton(voter, nomination).click();
  }
  // The page shows nothing new once a changed ranking is saved, so wait for the call itself
  // (tRPC batches calls, so it's found by name in the address)
  const saved = voter.waitForResponse(
    response => response.url().includes("award.submitRanking") && response.ok(),
  );
  await voter
    .getByRole("button", { name: /^(Submit|Update) Rankings$/ })
    .click();
  await saved;
  await expect(
    voter.getByRole("button", { name: "Update Rankings" }),
  ).toBeEnabled();
}

/**
 * A revealed category's results on the big screen, from first to last, as `[name, score]` (the
 * score as shown, such as "2 votes", or null when it's hidden). The first is the winner.
 */
export async function expectResults(
  screen: Page,
  category: string,
  results: [name: string, score: string | null][],
  options?: { timeout?: number },
) {
  const list = screen.getByRole("list", { name: `${category} results` });
  await expect(list.getByRole("listitem")).toHaveText(
    results.map(([name, score], index) => {
      const winner = index === 0 ? "🏆 Winner\\s*" : "";
      const shown = score ? `\\s*${score.replace(" ", "\\s*")}` : "";
      return new RegExp(`^${winner}${literal(name)}${shown}$`);
    }),
    options,
  );
}
