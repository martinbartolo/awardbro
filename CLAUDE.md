# AwardBro

Interactive award show app: hosts create a show with categories and nominations, voters vote from their phones, and results are revealed on a big screen.

**Stack:** Next.js 16 (App Router) · tRPC 11 · Prisma 7 (Neon adapter) · Tailwind 4 · shadcn/ui. Hosted on Vercel, Postgres on Neon.

## Commands

- `pnpm dev` runs the dev server (Turbopack).
- `pnpm check` runs ESLint and `tsc`. Run it before every commit.
- `pnpm build` makes a production build. Run it before opening a PR.
- `pnpm format:write` runs Prettier.
- `pnpm exec prisma …` runs Prisma (no global install). Migrations use `DATABASE_DIRECT_URL` via `prisma.config.ts`; the app uses the pooled `DATABASE_URL`.
- `vercel` and `neonctl` CLIs are linked to this project (Vercel `bartolo/awardbro`, Neon `fancy-glitter-44565313`).

## Workflow

- Work is tracked in Linear, project **AwardBro** (team `BAR`). New issues go in Backlog. Todo holds the next 3–5 unblocked issues.
- Branch from `dev` using the branch name Linear generates (e.g. `martin9oh9/bar-5-…`). Move the issue to In Progress when starting.
- Open PRs into `dev`, with `Fixes BAR-x` in the description. `dev` is merged into `main` to release.
- Pushing to `main` deploys to production (awardbro.com). Every other branch gets a Vercel preview.
- **No AI attribution anywhere.** Commit messages, PR titles, PR descriptions and comments must never include "Generated with Claude Code", "Co-Authored-By: Claude" or similar lines.

## Database safety

- **Local dev and Vercel Preview currently use the production database** (until Linear BAR-11 is done). Don't write test data against them.
- To test anything that writes, create a throwaway Neon branch (`neonctl branches create --name test-<issue>`), point `DATABASE_URL` / `DATABASE_DIRECT_URL` at it, and delete the branch afterwards.
- Change the schema with `prisma migrate dev`, never `db push`.

## Code rules

- tRPC router: `src/server/api/routers/award.ts`.
- Every route that changes a show must call `assertCanManage(ctx, …)` from `src/server/auth/manage.ts` first. Shows without a password are open to anyone with the link, by design.
- Never return `Session.password` (bcrypt hash) to the client. Use `omit: { password: true }` or an explicit `select`.
- Voters are identified by the httpOnly `device_id` cookie set in `src/proxy.ts`.
- Env vars are validated in `src/env.js`. Add new ones there and to `.env.example`, never real values.
- Nomination images are URLs in `description`; Google Drive links are converted to thumbnail URLs.
- Category types: `NORMAL`, `IMAGE`, `RANKING` (points = rankingTop − rank + 1), and `AGGREGATE` (sums source categories by nomination name). All are kept.
