# AwardBro

Award show app: hosts build a show, voters vote from their phones, results are revealed on a big screen. Next.js 16 + tRPC + Prisma on Vercel and Neon.

- How it works (data model, scoring, auth): @docs/architecture.md
- Setup, workflow, database and environments: @docs/development.md

## Commands

- `pnpm check` (types + lint) and `pnpm test` before every commit; `pnpm build` before every PR.
- Prisma has no global install: use `pnpm exec prisma …`.

## Workflow for every change

Follow "Making a change" in docs/development.md. In short, before opening a PR that changes more than docs or config:

1. `/simplify`, then an uncapped review (`/code-review high --max-findings all`) on the final diff. Fix real findings; give the reason for each skipped one in the PR.
2. `/security-review` when auth, cookies, user input or database queries are touched.
3. Split the work into logical commits. Feature PRs are **rebase-merged**; release PRs (`dev` → `main`) use a merge commit.
4. Add or update tests for anything with logic. Check UI changes on the Vercel preview in a browser.
5. Keep Linear in step: move the issue to In Progress when starting, and add new issues for any follow-up work you find.

## Rules

- **No AI attribution** in commits, PR titles, PR descriptions or comments. No "Generated with Claude Code", no "Co-Authored-By: Claude".
- Branch from `dev` with the Linear branch name; PR into `dev` with `Fixes BAR-x`. Never push to `main` directly: it deploys to production.
- Every route that changes a show calls `assertCanManage` (`src/server/auth/manage.ts`) before touching the database.
- Never send `Session.password` to the client: use `omit` or an explicit `select`.
- Schema changes: create migrations with `pnpm db:migrate:dev` against a throwaway Neon branch (never the shared `dev` branch), never use `db push`, and never edit a merged migration.
- Local dev and Preview use the Neon `dev` branch; only Production uses `main`. Never point local tools at production. Test risky or destructive changes on a throwaway Neon branch and delete it afterwards.
- New env vars go in `src/env.js` and `.env.example` (no real values).
