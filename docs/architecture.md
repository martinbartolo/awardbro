# Architecture

How AwardBro works. For setup and day-to-day workflow, see [development.md](development.md).

## Overview

A **host** creates an award show (a `Session`), adds categories and nominations, and runs the show from the manage page. **Voters** open the vote link on their phones and vote in whichever category is currently active. A **big screen** shows the present page, which displays the active category and reveals results.

| Route                             | Who        | What                                                                           |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| `/` , `/create`, `/join`, `/help` | Anyone     | Landing, create a show, enter a show's slug, help                              |
| `/manage/[slug]`                  | Host       | Add categories and nominations, set the active category, reveal, reset, delete |
| `/vote/[slug]`                    | Voters     | Vote in the active category                                                    |
| `/present/[slug]`                 | Big screen | Live view of the active category and the reveal                                |

**Stack:** Next.js App Router with Server Components for the initial render, tRPC + TanStack Query for client data, Prisma over the Neon serverless adapter. Everything runs on Vercel (Node.js runtime).

## Data model

Defined in `prisma/schema.prisma`.

- **Session**: a show. Unique URL `slug` (lowercase letters, numbers, hyphens). Optional `password` (bcrypt hash).
- **Category**: belongs to a session. Has a `type`, `isActive` (at most one active per session), `revealed`, and presentation options `hideVoteCounts` and `winnerOnly`.
- **Nomination**: belongs to a category. `description` is either text or an image URL.
- **Vote**: one row per voter per nomination, keyed by `deviceId`. `rank` is set only for ranking votes.
- **LoginAttempt**: manage password attempts for a show, one row per client and one for the whole show (count and time of the last one), for the attempt limits below.

Deleting a session cascades to its categories, nominations, votes and login attempts (`onDelete: Cascade`).

## Category types

| Type        | Voters do                             | Score                                                                                       |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `NORMAL`    | Pick one nomination                   | 1 point per vote                                                                            |
| `IMAGE`     | Pick one image                        | 1 point per vote. Nomination descriptions are image URLs.                                   |
| `RANKING`   | Rank their top N (`rankingTop`, 2–10) | 1st place = N points, 2nd = N − 1, … (`rankingTop − rank + 1`)                              |
| `AGGREGATE` | Nothing; voting is not allowed        | Sum of each nomination's score across its source categories, matched by **nomination name** |

Notes:

- Changing a vote in a normal or image category replaces the voter's previous vote. Re-submitting a ranking replaces the whole ranking.
- An aggregate's sources must be categories of the same show, and can't be aggregates themselves.
- A category can have the same nomination name twice with different descriptions (for example, one person nominated for two things, or several photos with the same caption), but not the same name (ignoring case) and description twice. An aggregate adds up every source nomination with exactly the same name, so those count together there.
- An aggregate category copies nominations from its sources when it's created. Nominations added to a source later are copied to the aggregate automatically.
- Scores are computed when they're read (`getSessionBySlug`, `getCategory`), not stored.
- Only hosts (anyone who can manage the show) get every score. Everyone else gets what the show reveals (`publicScores` in `scoring.ts`): no scores before a category is revealed, and after it only the winners' with `winnerOnly`, or only their order with `hideVoteCounts`. An aggregate reveals no more than its sources: nothing until all of them are revealed, and only the order if any of them hides its counts or shows only its winner. Each category (except an aggregate) also has `estimatedVoters`, the present page's live count, which everyone gets until the category is revealed (after it, only hosts: the total next to the winners' scores would give the others away). A show without a password can be managed by anyone, so anyone gets its scores.

## Running a show

1. The host sets a category **active**. That deactivates every other category in the show.
2. Voters see and vote in the active category only. The server rejects votes in inactive categories.
3. Votes and host actions don't interleave. Saving a vote takes the show's advisory lock shared, plus a lock per device and category, so each device has at most one vote (or one ranking) per category. These host actions take the show's lock exclusively: setting or stopping the active category, reveal, resetting votes, and deleting a nomination, category or show. They wait for votes already being saved, and votes arriving meanwhile wait for them (`saveVote` and `withShowLocked` in `award.ts`). Add new actions to this list if they close voting, change results or delete votes. Adding a nomination and creating an aggregate category take it too, so a nomination added while an aggregate of its category is being created is copied into the aggregate exactly once.
4. The host **reveals** the category. The present page then shows results, respecting `hideVoteCounts` (ranks without numbers) and `winnerOnly` (only first place).

## Identity and access

**Voters** have no accounts. `src/proxy.ts` gives every visitor to `/vote/*` and `/api/*` a random, httpOnly `device_id` cookie that lasts a year. Votes are tied to it.

**Hosts** prove access per show. The signed token and cookie logic is in `src/server/auth/manage-token.ts`; the checks against the database (`assertCanManage`, `hasManageAccess`) are in `src/server/auth/manage.ts`:

- Creating a show, or entering its password, sets a cookie `manage_<sessionId>`. It holds an expiry and an HMAC-SHA256 signature made with `AUTH_SECRET`, and lasts 30 days. The client sends mutations without streaming (`src/trpc/links.ts`): a streamed response sends its headers before the procedure runs, so the cookie would be lost.
- Every write route calls `assertCanManage` first. It finds the show that owns the target (session, category or nomination) and checks the cookie. `manage-access.integration.test.ts` checks this for every mutation, and fails when a new mutation isn't listed there.
- The manage page calls `hasManageAccess` on the server and renders only the password form until access is granted. If access is lost while the page is open (the cookie expires), the next action fails with UNAUTHORIZED and the page refreshes to the password form: every manage mutation's `onError` goes through `useManageErrorHandler` (`src/lib/hooks`).
- Shows created **without** a password are open: anyone with the link can manage them.
- Password attempts are limited per show, in the `LoginAttempt` table, so the limits hold across server instances (`src/server/auth/login-attempts.ts`). Each client (IP address, stored only as a keyed hash) gets 5 attempts per show, then is locked out for 15 minutes. The show as a whole gets 50, against guessing from many addresses. A client's refused attempts don't count towards that, so one client can't lock the host out. Attempts are counted before the password is checked, so parallel guesses can't get past the limits, and the right password clears them.
- The password hash is never sent to the client.

## Live updates

Clients currently **poll** with TanStack Query `refetchInterval`:

- **Present page:** the show every 5 s, and the active category's live count every 1 s (`live-voting.tsx`).
- **Vote page:** the active category and the voter's own vote every 5 s.
- **Manage page:** no polling. It's server-rendered and refreshes after the host's own actions. Replacing polling with push updates is planned in Linear milestone "3. Real-time".

## Environment variables

Validated in `src/env.js`:

| Variable              | Used for                                                                        |
| --------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Pooled Neon connection, used by the app                                         |
| `DATABASE_DIRECT_URL` | Direct Neon connection, used by Prisma migrations (`prisma.config.ts`)          |
| `AUTH_SECRET`         | Signs manage-access cookies. At least 32 characters, different per environment. |
