# Architecture

How AwardBro works. For setup and day-to-day workflow, see [development.md](development.md).

## Overview

A **host** creates an award show (a `Session`), adds categories and nominations on the manage page, and runs the show from its run view, on a laptop or a phone. **Voters** join on their phones, by scanning the QR code on the big screen or typing the room code on the homepage, and vote in whichever category is currently active. A **big screen** shows the present page, which displays the active category and reveals results.

| Route                | Who        | What                                                                      |
| -------------------- | ---------- | ------------------------------------------------------------------------- |
| `/`, `/create`       | Anyone     | Landing (enter a room code to vote or manage), create a show              |
| `/manage/[code]`     | Host       | Set up the show: categories and nominations, running order, reset, delete |
| `/manage/[code]/run` | Host       | Run the show: open voting, close it, reveal, next                         |
| `/vote/[code]`       | Voters     | Vote in the active category                                               |
| `/present/[code]`    | Big screen | Live view of the active category and the reveal                           |

Shows are found by their room code, such as `/vote/K7QF`. Links from before room codes use the show's slug; they, and a code in lowercase, redirect to the code URL (`showPage` in `src/server/shows.ts`). No code reads like another show's slug: the room code migrations and `generate_room_code()` make sure of it.

There is no help page: each screen explains itself (the category types, the next step when running the show). `/help` redirects to the homepage for old links.

**Stack:** Next.js App Router with Server Components for the initial render, tRPC + TanStack Query for client data, Prisma over the Neon serverless adapter. Everything runs on Vercel (Node.js runtime).

## Data model

Defined in `prisma/schema.prisma`.

- **Session**: a show. Unique room `code`: 4 random characters without easily confused ones (no 0/O, 1/I/L or U), picked by the database from those not in use, as a code or as a slug (`generate_room_code()`, which takes a lock so shows created at the same moment can't draw the same one). `slug` (optional): the URL name of shows from before room codes, kept only so their old links redirect to the code. New shows have none. `password` (bcrypt hash): required for new shows; shows created before that may have none. `screenTheme`: how the big screen looks, Night (dark, the default) or Paper (light), set by the host (`setScreenTheme`).
- **Category**: belongs to a session. Has a `type`, its stage in the show (`isActive`: on the big screen, at most one per session; `votingClosed`; `revealed`), presentation options `hideVoteCounts` and `winnerOnly`, and `position`, its place in the show's running order (from 0). Every list of categories uses that order (`runningOrder` in `award.ts`), including an aggregate's sources. A new category goes to the end, and the host moves one up or down a place at a time (`moveCategory`, which swaps it with its neighbour as the show is now, so a click from an out-of-date page can't restore an old order). The migration numbered existing shows in creation order. Positions can only tie if code from before them adds a category (while the release that added them was building, or after a rollback); ties go by creation time, and the next move numbers the show again.
- **Nomination**: belongs to a category. `description` is text, or in an image category the address of a picture hosted elsewhere (AwardBro stores no pictures). The server turns common share links into the picture's own address before storing it (`parseImageLink` in `src/lib/images.ts`: Google Drive, imgur, Dropbox, and OneDrive share links through its sharing API) and refuses links that need a sign-in (Google Photos, iCloud) or would be too long to store. It never fetches the link; the add and edit forms show a preview loaded by the host's browser and save only once it loads (or when an edit keeps the saved link). Older links stored as pasted are converted when they're shown. Every nomination of an image category, or of an aggregate of only image categories (`showsPictures`), shows as a picture, with a placeholder if it no longer loads. Elsewhere only plain picture links (an image file or a Google Drive file) show as pictures, as in older shows, so in an aggregate that mixes image and other categories, a picture link without an image file name shows as text.
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
- An aggregate category holds a copy of each nomination name in its sources, with the description of the first one added (`reconcileAggregate` in `award.ts`). Every change to a source nomination brings the copies of the names it touches back in line: adding, renaming or deleting a nomination, and deleting a source category. A copy no source has any more is removed (aggregates take no votes, so none are lost). Creating an aggregate or changing its sources reconciles every name. A copy the host deleted from the aggregate stays deleted until a source nomination of that name changes.
- Hosts can edit a category (name, description, a ranking's number of places, an aggregate's sources) and a nomination (name, description) in place on the manage page (`updateCategory`, `updateNomination`). The type can't change. A ranking's places can't change once anyone has voted, since that would change everyone's points. Votes stay with a renamed nomination. If another source nomination already has the new name, they now count together in the aggregate, and the host is told. An aggregate's own nominations can't be edited.
- Scores are computed when they're read (`getSession`, `getCategory`), not stored. A ranking category's points come from each nomination's number of ranked votes and the sum of their ranks, which the database adds up (`rankingTop − rank + 1` per vote is `count × (rankingTop + 1) − the sum of the ranks`), so the votes themselves aren't loaded. The vote page reads the show with `getActiveCategory`, which has only the category on the big screen and its nominations, without scores.
- Each nomination comes with its `score` (votes, or points) and its `place` (1 for the highest score, then 2, and so on; ties share a place, and a nomination without votes has none), either of them null when it's hidden.
- Only hosts (anyone who can manage the show) get every score. Everyone else gets what the show reveals (`visibleScores` in `scoring.ts`): nothing before a category is revealed, and after it only the winners with `winnerOnly`, or only the places with `hideVoteCounts`. The big screen always gets this view (`getSession` with `bigScreen`), even on a host's laptop. An aggregate reveals no more than its sources: nothing until all of them are revealed, and only the order if any of them hides its counts or shows only its winner. Each category (except an aggregate) also has `estimatedVoters`, the present page's live count, which everyone gets until the category is revealed (after it, only hosts: the total next to the winners' scores would give the others away). A show without a password (only older shows) can be managed by anyone, so anyone gets its scores.

## Running a show

The host runs the show from the run view (`run-show.tsx`), one category at a time in the running order. One button takes the next step, and each step sets the category's stage on the server (`setCategoryStage`, which sets the whole state rather than toggling, so a repeated click or an out-of-date page can't flip it):

| Stage       | On the big screen                        | Voting | Set by                                                            |
| ----------- | ---------------------------------------- | ------ | ----------------------------------------------------------------- |
| Not started | No                                       | No     | Not started yet, or taken off the screen while voting             |
| `open`      | The live count                           | Open   | **Open voting**. Takes any other category off the screen.         |
| `closed`    | The final count (if still on the screen) | Closed | **Close voting**, to build suspense before the reveal             |
| `revealed`  | The results                              | Closed | **Reveal the winner**                                             |
| `off`       | No (stays closed, or revealed: done)     | Closed | **Next**, which moves the run view to the next category to reveal |

1. The run view is on the category on the big screen, or the next one to reveal (skipping an aggregate still waiting for its sources). The host can pick another from the running order below it. Each step sends the stage the host's page showed, and the server refuses it if another device has moved the category on meanwhile, so an out-of-date page can't move it back.
2. Voters see and vote in the category on the big screen only. The server refuses votes in a category that isn't on the screen, is closed or is revealed (`assertVotingOpen`). The vote page and the big screen say "Voting has closed" once it is.
3. An aggregate takes no votes, so it goes straight to the reveal, once every category it adds up is revealed (it shows no more than they do).
4. At the reveal, the host sets how it shows the results (`setRevealOptions`): `hideVoteCounts` (the order without numbers) and `winnerOnly` (only first place). They can change while the results show. The run view says when nobody has voted.
5. The host can step back: reopen voting from closed, hide the results (back to closed), or take a category off the screen.
6. Votes and host actions don't interleave. Saving a vote takes the show's advisory lock shared, plus a lock per device and category, so each device has at most one vote (or one ranking) per category. These host actions take the show's lock exclusively: changing a category's stage, resetting votes, and deleting a nomination, category or show. They wait for votes already being saved, and votes arriving meanwhile wait for them (`saveVote` and `hostWrite` in `award.ts`). Every host write runs through `hostWrite`, so the others take it too: adding or editing a nomination, creating, editing or moving a category, and setting reveal options. So aggregate copies are changed by one action at a time (a nomination added while an aggregate of its category is being created is copied into it exactly once), and a ranking's places can't change while a first vote is being saved.

## The big screen

The present page (`live-presentation.tsx`) shows the category on the screen with "Award 4 of 9" (`progress` from `getSession` with `bigScreen`), then, as the host steps through it: how to join and the live count, "Voting has closed", and the results as a podium (`podium-reveal.tsx`, with the layout worked out in `src/lib/podium.ts`):

- Each nomination is a column, as tall as its score (or stepped by place when the counts are hidden), the winner in the middle with 2nd and 3rd to its left (3rd, 2nd, 1st, 4th, 5th). Past seven nominations, the top five get columns and the rest share one block.
- Each column has its own colour from `--column-1` to `--column-7`, shuffled with the category's id as the seed, so every screen and reload agrees. The winner's column turns the winner colour once crowned; tied winners are crowned together.
- The reveal plays once per category, as it happens on this screen (an aggregate's too, which goes straight to its reveal): the runners-up rise from the shortest, the leader stalls and shakes, "And the winner is…" fills the screen, then the winner is crowned with confetti (`src/lib/confetti.ts`, a canvas burst of the shape set, halved only if the first half second's frames run slow). A reload (or a screen that already showed that category's reveal, when the host shows its results again), or a device set to reduce motion, shows the result at once, without confetti.
- Everything is sized from `--u` (`big-screen` in `globals.css`), a hundredth of the largest 16:9 frame that fits, so it keeps its proportions on any screen, 4:3 projectors included, and stays clear of the outer 5% that TVs may crop.
- It keeps the screen awake (Screen Wake Lock, asked for again when the tab is shown), goes fullscreen with one click or the F key, and hides the button and cursor while the mouse rests.
- It follows the host's theme for it (`screenTheme`), live: the page puts `data-theme="light"` on `<html>` for Paper, so toasts and dialogs follow too.

## The vote page

The voter's phone (`live-voting-session.tsx`) shows the category on the big screen with the nominations as tiles, and a vote button pinned at the bottom that names the pick ("Vote for The Worm"): a normal category is a radio group, an image category the same with photos two to a row, and a ranking takes taps in order (each tile shows its place; a tap takes it out again) until "Submit my top 3". Once the vote is in, the page says "Your vote is in", and "Change my vote" goes back to the tiles. When voting closes, it shows what the voter's vote was. A new category replaces the page's state, so a vote never shows against the next one.

It follows the phone's light or dark setting, or the theme the voter picks with the toggle in its header, remembered on the device (`src/lib/device-theme.ts`). A small inline script sets it before the first paint, so a light phone never flashes dark; it's fixed text, with nothing from a visitor in it. The host views (the manage page, the run view and their password form) follow the host's device the same way, through their layout (`DeviceTheme`); the big screen keeps the theme the host sets for the show.

## Joining a show

The present page shows a QR code that opens the vote page, the site's address and the room code: large while waiting and during voting, and small at the top right once voting has closed, during a reveal, or while an aggregate category (which takes no votes) is on the screen. The QR code is generated in the browser, without a third-party service. Voters type the code on the homepage (`RoomCodeForm`): it looks the code up (ignoring case and spaces, or from a pasted vote link) with `findShow` and opens the vote page. `/join`, where the form used to be, redirects there. Hosts get back to their show with "Manage your show" on the homepage, the same form opening `/manage/<code>`; creating a show opens it straight away. The manage page puts the room code, the big screen (with its theme, Night or Paper) and Run the Show in one card at the top, and resetting votes and deleting the show in a danger zone at the bottom. A room code doesn't restrict who can vote.

## Identity and access

**Voters** have no accounts. `src/proxy.ts` gives every visitor to `/vote/*` and `/api/*` a random, httpOnly `device_id` cookie that lasts a year. Votes are tied to it.

**Hosts** prove access per show. The signed token and cookie logic is in `src/server/auth/manage-token.ts`; the checks against the database (`assertCanManage`, `hasManageAccess`) are in `src/server/auth/manage.ts`:

- Creating a show, or entering its password, sets a cookie `manage_<sessionId>`. It holds an expiry and an HMAC-SHA256 signature made with `AUTH_SECRET`, and lasts 30 days. The client sends mutations without streaming (`src/trpc/links.ts`): a streamed response sends its headers before the procedure runs, so the cookie would be lost.
- Every write route calls `assertCanManage` first. It finds the show that owns the target (session, category or nomination) and checks the cookie. `manage-access.integration.test.ts` checks this for every mutation, and fails when a new mutation isn't listed there.
- The manage page calls `hasManageAccess` on the server and renders only the password form until access is granted. If access is lost while the page is open (the cookie expires), the next action fails with UNAUTHORIZED and the page refreshes to the password form: every manage mutation's `onError` goes through `useManageErrorHandler` (`src/lib/hooks`).
- New shows need a password (`sessionFormSchema`): the room code is on the big screen, so the password is what keeps the audience out of the manage page. Shows created before that may have none; they stay open, and anyone with the room code can manage them.
- Password attempts are limited per show, in the `LoginAttempt` table, so the limits hold across server instances (`src/server/auth/login-attempts.ts`). Each client (IP address, stored only as a keyed hash) gets 5 attempts per show, then is locked out for 15 minutes. The show as a whole gets 50, against guessing from many addresses. A client's refused attempts don't count towards that, so one client can't lock the host out. Attempts are counted before the password is checked, so parallel guesses can't get past the limits, and the right password clears them.
- The password hash is never sent to the client.

## Live updates

After every write, the server tells the show's open pages what changed (`src/server/events.ts`). Pages use the event as a signal to fetch again: events carry no scores or votes, so the database stays the only source of truth.

| Event   | Sent by                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `show`  | Any host action: categories, nominations, running order, a category's stage or reveal options, the big screen's theme, resetting votes, deleting the show |
| `votes` | A voter's vote or ranking, with its `categoryId`                                                                                  |

How they travel, with no service besides the database:

1. Every host write runs through `hostWrite` in `award.ts`, which takes the show's lock and sends the route's event (`notifyShow`, Postgres `NOTIFY`) in one statement. Votes do the same in `saveVote`. Postgres delivers a notification only when its transaction commits, so pages never hear of a write that was rolled back, and they hear of writes in the order they committed. `events.integration.test.ts` checks each mutation's event, and fails when a mutation isn't listed there.
2. Each server instance with open pages holds one `LISTEN` connection (`event-hub.ts`). It connects when the first page subscribes and closes when the last one leaves. It uses `DATABASE_DIRECT_URL`, since Neon's pooler can't `LISTEN`. It throttles each category's `votes` events to one every 500 ms, folding the rest of a burst into one more at the end, so a burst of votes makes a few fetches rather than one per vote.
3. Pages get the events as Server-Sent Events from `/api/shows/<code>/events` (`event-stream.ts`): `event: show` or `event: votes`, with the rest of the event as JSON data (`?votes=0` leaves out `votes` events). The response starts only once the instance is listening, so a page that fetches when the stream opens misses nothing. A stream ends after 220–280 s, at random, before Vercel's 300 s limit on Hobby, and `EventSource` connects again by itself 1–2 s later. If an instance loses its database connection (it checks every 30 s), it ends every stream, so their pages connect again. If it can't listen at all, the route sends an empty stream that tells `EventSource` to try again in 20–30 s, since an error status would make it give up. A page that stops reading its stream has it ended after 100 queued events. Anyone with the room code can listen, as anyone can load the show.

Why this rather than a hosted service (Ably, Pusher, Supabase Realtime): see BAR-17 in Linear. Their free plans can't hold a large show (connection limits), or charge per voter.

Pages listen with `useShowEvents` (`connectShowEvents` in `src/lib/show-events.ts`):

- **When the stream opens or reopens, and on a `show` event,** a page fetches all its queries for the show again: the show (the vote page's `getActiveCategory`), live counts and the voter's own votes. That covers anything it missed while it wasn't listening.
- **On a `votes` event,** pages that show live counts (the big screen and the run view, `liveCounts`) fetch that category's count again.
- **Voters' phones** ask for no `votes` events (`?votes=0`). After a host action, each phone waits a random moment (up to 1 s, `crowd`) before fetching, so a room full of phones doesn't fetch at once.
- **`EventSource` connects again by itself** when a stream ends. If it gives up (an error status, such as a deleted show), the page connects again after 10–20 s, up to 5 times in a row.
- **While the stream isn't open** (and the page is visible), the page fetches the show every 30 s instead.
- **A tab hidden for a minute** (left open in the background, or a locked phone) closes its stream and stops fetching. While any page listens, its server instance keeps a connection to the database and checks it every 30 s, so the database could never sleep, which would use up Neon's free compute hours. When the tab is shown again, the page connects again and, as the stream opens, fetches everything. A quick switch away and back keeps the stream.
- **The manage page** (`manage-show.tsx`) listens without `votes` events: its scores follow host actions, made on any device.

The person who acts sees the result straight away, before the server answers (`optimistic` in `src/lib/optimistic.ts`, through `useShowChange` for host actions): a host's step or reveal option in the run view (`applyStage` in `stages.ts` does what the server will), every action on the manage page (`show-changes.ts`), and a voter's vote or ranking. On the manage page, a new nomination shows as "Adding..." until the server has saved it, and edit forms stay open until the server has saved the change, so a refused one keeps what the host typed. Adding a category is the exception: it shows once the server has created it, since an aggregate's nominations are copied on the server. If the server refuses, the page goes back and says why; a step another device overtook shows where the category really is. Either way the page fetches the changed query once the server has answered. While the action is on its way, live events don't fetch that query (it's named in the mutation's `meta.holds`), so they can't bring back the data from before it; they fetch everything else straight away.

## Environment variables

Validated in `src/env.js`:

| Variable              | Used for                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Pooled Neon connection, used by the app                                                                       |
| `DATABASE_DIRECT_URL` | Direct Neon connection: Prisma migrations (`prisma.config.ts`) and listening for live events (`event-hub.ts`) |
| `AUTH_SECRET`         | Signs manage-access cookies. At least 32 characters, different per environment.                               |
| `DATABASE_DRIVER`     | Optional. `pg` for plain Postgres (the end-to-end tests); else Neon's driver                                  |
