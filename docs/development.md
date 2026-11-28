# Development

How to work on AwardBro day to day. For how the app works, see [architecture.md](architecture.md).

## Setup

Requirements: Node 26 (matches Vercel), pnpm 12 (pinned in `packageManager`; pnpm switches to it automatically), and access to the Vercel project `bartolo/awardbro` and the Neon project `awardbro` (`fancy-glitter-44565313`).

```bash
pnpm install
vercel link --project awardbro   # once
vercel env pull .env.local       # Development values: the Neon `dev` branch and a dev AUTH_SECRET
pnpm dev
```

Local development uses the Neon `dev` branch, never production. Don't keep production credentials in `.env` or `.env.local`.

## Commands

| Command                             | Does                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`                          | Dev server (Turbopack)                                                                                                         |
| `pnpm check`                        | Next types, ESLint and TypeScript. Run before every commit. Needs `.env.local` (`vercel env pull`) or `SKIP_ENV_VALIDATION=1`. |
| `pnpm test`                         | Unit tests (Vitest). `pnpm test:watch` while developing.                                                                       |
| `pnpm test:integration`             | Integration tests: the tRPC API against a real Postgres database. Needs `TEST_DATABASE_URL`, see below.                        |
| `pnpm test:e2e`                     | End-to-end tests: whole shows in a browser (Playwright), against a production build. Needs `TEST_DATABASE_URL`, see below.     |
| `pnpm build`                        | Production build. Run before opening a PR.                                                                                     |
| `pnpm format:write`                 | Prettier                                                                                                                       |
| `pnpm db:migrate:dev --name <name>` | Create a migration (run against a throwaway branch, see below)                                                                 |
| `pnpm db:studio`                    | Browse the `dev` database                                                                                                      |

## Workflow

### Planning

All work lives in the Linear project **AwardBro** (team `BAR`).

- **Backlog:** anything not yet committed to.
- **Todo:** the next 3–5 unblocked issues.
- **In Progress:** has a branch.
- **Done:** merged into `dev`. Linear closes the issue automatically from `Fixes BAR-x`.

When you find follow-up work while on an issue, file it as a new Backlog issue instead of widening the PR.

Only mention an issue ID in a PR that actually works on that issue: Linear links every ID it sees and moves it to In Progress.

### Making a change

The fast checks run all the time; the slow ones run once, on the finished code.

1. **Branch** from `dev` with the branch name Linear generates (e.g. `martin9oh9/bar-5-…`) and move the issue to In Progress.
2. **Build it in logical steps, committing each one as it's done.** Write tests for anything that has logic. Before each commit, run `pnpm check` and `pnpm test` (seconds). Each commit builds and makes sense on its own (e.g. "add missing migration step", "catch up schema drift", "document migration rules"). Don't leave the split for the end.
3. **Review the finished diff.** When the change is more than docs or config:
   1. Run **`/simplify`** and apply what's worth keeping.
   2. Run an **uncapped code review** (`/code-review high --max-findings all`). Fix the real findings; for each one you skip, give the reason in the PR.
   3. Run **`/security-review`** if the change touches auth, cookies, user input, or database queries.

   Commit the fixes as you make them, into the commit they belong to when it's clearer (`git commit --fixup`, then `git rebase --autosquash`).
4. **Run the slow checks once, on the final code:** `pnpm build`, then `pnpm test:integration` when the API or the schema changed, then `pnpm test:e2e` when pages or components changed. Both suites run against a local Postgres (see "Integration tests") and take a minute or two.
   - Don't change any files while they run: they read the code as they go.
   - If a suite fails, fix the code and run that suite again. If it fails twice for a reason outside the code (the database, the network, a timeout), stop and find the cause rather than running it a third time.
5. **Open a PR into `dev`** with `Fixes BAR-x`, a summary, how it was tested, and the review outcomes.
6. **Wait for the checks:** CI (lint, types, format, unit tests, migration replay, integration tests and end-to-end tests, each run only when what it covers changed) and the Vercel preview. Both are required.
7. **Check UI changes in a browser** on the Vercel preview, at phone size for voter screens.
8. **Rebase-merge** into `dev`, so each commit lands as it is. The branch is deleted automatically.

Commits and PRs never include AI attribution lines ("Generated with Claude Code", "Co-Authored-By: Claude", or similar).

### Releasing (`dev` → `main`)

Release when a useful set of changes is on `dev` and its preview has been checked. Avoid releasing right before a live show.

1. **Check `dev`'s preview end to end:** create a show, add each category type, vote at phone size, present and reveal, and manage both with and without the password.
2. **Open a release PR** from `dev` into `main`, titled `Release YYYY-MM-DD`. The description lists the Linear issues included and anything hosts will notice.
3. **Check the PR:** CI is green, and if migrations are included, read them once more. They run against production during the build.
4. **Merge with a merge commit** (not rebase), so `dev` and `main` share history.
5. **After the deploy:**
   - the Vercel build log shows migrations applied (or "No pending migrations")
   - awardbro.com loads, and a show can be voted on and presented
   - `vercel logs` shows no new errors for about 10 minutes
6. **If something is wrong:** `vercel rollback` restores the previous production deployment straight away. Then fix forward on `dev`.

   Rollback does **not** undo database migrations. That's why migrations must be backwards compatible: add columns and tables first, and only remove old ones in a later release.

### Repository settings

- Squash merges are disabled, so a PR's commits land on `dev` as they are.
- Branch protection on `dev` and `main` requires two checks: **All checks** (CI) and **Vercel**. CI's first job finds which parts of the repository a PR changed, and each job runs only when it can be affected: lint, types, format and unit tests on any code, config or the schema; migrations and integration tests on the schema and the API (`prisma/`, `src/server`, `src/lib`, `src/test`); end-to-end tests on anything the app is built from. A docs-only PR runs none of them. A change to the workflow, `package.json`, the lockfile or `tsconfig.json` runs them all. "All checks" passes only when every job whose part changed passed, and fails if the changes job gives no clear answer, so it's the only CI check to require. Add a new job to its `needs` and to its list of jobs, and its paths to the filters in `.github/workflows/ci.yml`.
- Dependabot opens grouped dependency PRs against `dev` once a month.
- pnpm refuses package versions published less than a day ago (`minimumReleaseAge`, its default since pnpm 11), to keep a freshly compromised release out. Dependabot waits a day before proposing a version, to match. If an install fails on it, wait, or use the previous release.

## Database

- **Schema changes** go through migrations: edit `prisma/schema.prisma`, then create the migration with `pnpm db:migrate:dev --name <name>` **against a throwaway Neon branch** (see below). Never run it against the shared `dev` branch: if another PR's preview has added migrations there, Prisma offers to reset the database, which would wipe it for everyone.
- Never use `prisma db push`. It changes the database without recording a migration, which is how the history drifted before (fixed in BAR-6).
- **Migrations must replay on an empty database**, and a merged migration is never edited; add a new one instead.
- `pnpm db:migrate` runs `prisma migrate deploy`, which only applies pending migrations. Vercel builds do this automatically.
- **Migrations** run automatically during every Vercel build (`prisma migrate deploy` in `vercel.json`). A PR's preview build applies its migrations to the `dev` branch; merging to `main` applies them to production.
- **The `dev` branch** is shared by local development and all previews. To start fresh from a copy of production:

  ```bash
  neonctl branches reset dev --parent
  ```

- **Testing something risky or destructive:** use a throwaway branch instead, then delete it.

  ```bash
  neonctl branches create --name test-bar-123
  neonctl connection-string test-bar-123 --pooled   # → DATABASE_URL
  neonctl connection-string test-bar-123            # → DATABASE_DIRECT_URL
  # run the app or tests with those values, then:
  neonctl branches delete test-bar-123
  ```

## Integration tests

`pnpm test:integration` calls the tRPC router through a server-side caller against a real Postgres database (`src/**/*.integration.test.ts`). It applies the migrations to that database, then empties every table before each test. CI runs it against its own Postgres service whenever the schema or the API changes (see "Repository settings").

To protect real data, the tests only run against a database whose name ends in `_test`, given by `TEST_DATABASE_URL` in the shell (it isn't read from `.env.local`). `dev` and production are both called `neondb`, so they are refused. Locally, use any Postgres, or a throwaway Neon branch with its own empty database:

```bash
neonctl branches create --name test-bar-123 --parent dev
neonctl databases create --branch test-bar-123 --name awardbro_test
TEST_DATABASE_URL="$(neonctl connection-string test-bar-123 --database-name awardbro_test)" pnpm test:integration
neonctl branches delete test-bar-123
```

A full run takes about 20 seconds in CI. Against Neon from further away it takes a few minutes, since every call is a round trip to Frankfurt.

The app's client uses Neon's serverless driver, which can't reach a plain Postgres server, so the tests swap in the standard `pg` driver (`src/test/integration/db.ts`). The router code and its queries are the same.

## End-to-end tests

`pnpm test:e2e` runs whole shows in Chromium with Playwright (`e2e/*.spec.ts`): a host sets up a category of each type, guests vote on phone-sized pages (changing a vote and a ranking), and the big screen shows each result and the presentation options as the host reveals them. Other tests check the manage page's password. Every person gets a browser of their own, so they share no cookies. CI runs them whenever anything the app is built from changes (see "Repository settings").

The tests build the app (`pnpm build && pnpm start`, on port 3200 or `E2E_PORT`; the build replaces `.next`, so stop a local `pnpm start` first) and point it at `TEST_DATABASE_URL`, the same `_test` database as the integration tests, after applying the migrations. Every test creates its own show, so they don't empty the database and can run side by side. Don't run them at the same time as the integration tests on one database. The app uses the standard `pg` driver for it (`DATABASE_DRIVER=pg`, see `src/server/db.ts`), which works against Neon too. Pictures in image categories come from `https://pictures.e2e.test`, which the tests answer themselves.

Once, after `pnpm install`: `pnpm exec playwright install chromium`. Then, with a database as in "Integration tests":

```bash
TEST_DATABASE_URL="…/awardbro_test" pnpm test:e2e
pnpm exec playwright show-report   # after a failure: steps, screenshots and traces
```

A run takes about 2 minutes here, most of it the build. In CI, a failed run uploads the report as the `playwright-report` artifact.

Locate elements the way people find them (roles, labels and visible text, through the helpers in `e2e/show.ts`), not by class names, so the tests keep working through a redesign. If a test can't find something by its role or label, give the element one: that helps screen reader users too.

## Load test

`scripts/load-test.ts` runs a simulated live show against a deployment: a host on the run view, a big screen and 300 voters' phones. The voters join over 15 seconds, then vote in a burst of 10 seconds when the host opens each category, a normal one (some change their vote) and a ranking. The host then closes and reveals it. Each simulated page fetches what the real one does when its stream opens and on each event. The script reports:

- each request's time and failures
- how fast each host action reached every page
- whether the big screen showed every vote, and how soon after the last one
- with `LOAD_TEST_DATABASE_URL`, the database connections the show used, including the instances listening for events (their connections are named `awardbro-events`)

Run it against a preview, never production: it creates a show (deleted at the end, even if the script fails) and makes hundreds of votes. It asks `vercel inspect` whether the URL is a preview and refuses anything else, so it needs the Vercel CLI logged in and the project linked. Previews share the `dev` database, so tell anyone using it first.

```bash
node scripts/load-test.ts https://awardbro-<id>-bartolo.vercel.app [--voters 300] [--join 15] [--burst 10]
LOAD_TEST_DATABASE_URL="<the dev branch's direct URL>" node scripts/load-test.ts …
```

The results of the first run, before the first live show, are in BAR-20.

## Environments

| Environment | Trigger                           | Database           |
| ----------- | --------------------------------- | ------------------ |
| Production  | Push to `main`                    | Neon `main` branch |
| Preview     | Any other branch / PR             | Neon `dev` branch  |
| Development | `pnpm dev` with `vercel env pull` | Neon `dev` branch  |

Functions run in Frankfurt (`fra1`, set in `vercel.json`), next to the Neon database in `aws-eu-central-1`. Node is pinned to 26 (`.node-version` and `engines`), matching Vercel. Dependabot skips major updates of `@types/node`; raise them together with the runtime.

Each environment has its own `DATABASE_URL`, `DATABASE_DIRECT_URL` and `AUTH_SECRET`. Env vars are managed with `vercel env`. Add new variables to `src/env.js` and `.env.example` too (never with real values).
