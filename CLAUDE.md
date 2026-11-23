# AwardBro

Award show app: hosts build a show, voters vote from their phones, results are revealed on a big screen. Next.js 16 + tRPC + Prisma on Vercel and Neon.

- How it works (data model, scoring, auth): @docs/architecture.md
- Setup, workflow, database and environments: @docs/development.md

## Commands

- `pnpm check` (lint + types) before every commit; `pnpm build` before every PR.
- Prisma has no global install: use `pnpm exec prisma …`.

## Rules

- **No AI attribution** in commits, PR titles, PR descriptions or comments. No "Generated with Claude Code", no "Co-Authored-By: Claude".
- Branch from `dev` with the Linear branch name; PR into `dev` with `Fixes BAR-x`. Never push to `main` directly: it deploys to production.
- Every route that changes a show calls `assertCanManage` (`src/server/auth/manage.ts`) before touching the database.
- Never send `Session.password` to the client: use `omit` or an explicit `select`.
- Schema changes go through `prisma migrate dev`, never `db push`.
- Local dev and Preview use the Neon `dev` branch; only Production uses `main`. Never point local tools at production. Test risky or destructive changes on a throwaway Neon branch and delete it afterwards.
- New env vars go in `src/env.js` and `.env.example` (no real values).
