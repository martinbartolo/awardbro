# Development

How to work on AwardBro day to day. For how the app works, see [architecture.md](architecture.md).

## Setup

Requirements: Node 24 (matches Vercel), pnpm 10, and access to the Vercel project `bartolo/awardbro` and the Neon project `awardbro` (`fancy-glitter-44565313`).

```bash
pnpm install
vercel link --project awardbro   # once
vercel env pull .env.local       # DATABASE_URL, DATABASE_DIRECT_URL, AUTH_SECRET
pnpm dev
```

> ⚠️ Until Linear **BAR-11** is done, the Development and Preview environments use the **production** database. Don't create test data with `pnpm dev`; use a Neon branch (below).

## Commands

| Command                                      | Does                                          |
| -------------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                   | Dev server (Turbopack)                        |
| `pnpm check`                                 | ESLint + TypeScript. Run before every commit. |
| `pnpm build`                                 | Production build. Run before opening a PR.    |
| `pnpm format:write`                          | Prettier                                      |
| `pnpm exec prisma migrate dev --name <name>` | Create and apply a migration                  |
| `pnpm exec prisma studio`                    | Browse the database                           |

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

- **Schema changes** go through migrations: edit `prisma/schema.prisma`, then run `pnpm exec prisma migrate dev`. Don't use `db push`; it skips the migration history.
- **Testing anything that writes:** use a throwaway Neon branch, then delete it.

  ```bash
  neonctl branches create --name test-bar-123
  neonctl connection-string test-bar-123 --pooled   # → DATABASE_URL
  neonctl connection-string test-bar-123            # → DATABASE_DIRECT_URL
  # run the app or tests with those values, then:
  neonctl branches delete test-bar-123
  ```

## Environments

| Environment | Trigger                           | Database                        |
| ----------- | --------------------------------- | ------------------------------- |
| Production  | Push to `main`                    | Neon main branch                |
| Preview     | Any other branch / PR             | Neon main branch (until BAR-11) |
| Development | `pnpm dev` with `vercel env pull` | Neon main branch (until BAR-11) |

Env vars are managed with `vercel env`. Add new variables to `src/env.js` and `.env.example` too (never with real values).
