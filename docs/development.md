# Development

How to work on AwardBro day to day. For how the app works, see [architecture.md](architecture.md).

## Setup

Requirements: Node 24 (matches Vercel), pnpm 10, and access to the Vercel project `bartolo/awardbro` and the Neon project `awardbro` (`fancy-glitter-44565313`).

```bash
pnpm install
vercel link --project awardbro   # once
vercel env pull .env.local       # Development values: the Neon `dev` branch and a dev AUTH_SECRET
pnpm dev
```

Local development uses the Neon `dev` branch, never production. Don't keep production credentials in `.env` or `.env.local`.

## Commands

| Command                             | Does                                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                          | Dev server (Turbopack)                                         |
| `pnpm check`                        | ESLint + TypeScript. Run before every commit.                  |
| `pnpm build`                        | Production build. Run before opening a PR.                     |
| `pnpm format:write`                 | Prettier                                                       |
| `pnpm db:migrate:dev --name <name>` | Create a migration (run against a throwaway branch, see below) |
| `pnpm db:studio`                    | Browse the `dev` database                                      |

## Workflow

1. **Linear.** All work lives in the Linear project **AwardBro** (team `BAR`).
   - **Backlog:** anything not yet committed to.
   - **Todo:** the next 3–5 unblocked issues.
   - **In Progress:** has a branch.
   - **Done:** merged.
2. **Branch** from `dev`, using the branch name Linear generates (e.g. `martin9oh9/bar-5-…`). This links the branch to the issue.
3. **PR into `dev`** with `Fixes BAR-x` in the description. Vercel builds a preview for every PR.
4. **Release** by merging `dev` into `main`. Pushing to `main` deploys to production (awardbro.com).

Commits and PRs never include AI attribution lines ("Generated with Claude Code", "Co-Authored-By: Claude", or similar).

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

## Environments

| Environment | Trigger                           | Database           |
| ----------- | --------------------------------- | ------------------ |
| Production  | Push to `main`                    | Neon `main` branch |
| Preview     | Any other branch / PR             | Neon `dev` branch  |
| Development | `pnpm dev` with `vercel env pull` | Neon `dev` branch  |

Functions run in Frankfurt (`fra1`, set in `vercel.json`), next to the Neon database in `aws-eu-central-1`. Node is pinned to 24 (`.node-version` and `engines`), matching Vercel.

Each environment has its own `DATABASE_URL`, `DATABASE_DIRECT_URL` and `AUTH_SECRET`. Env vars are managed with `vercel env`. Add new variables to `src/env.js` and `.env.example` too (never with real values).
