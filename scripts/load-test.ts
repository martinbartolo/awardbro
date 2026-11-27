/* eslint-disable no-console -- a command-line report */
/**
 * A simulated live show against a deployment (BAR-20): a host on the run view, a big screen on
 * the present page, and a room of voters on their phones. The voters join over a few seconds,
 * then vote in a burst when the host opens each category: a normal one (some change their vote)
 * and a ranking. The host closes and reveals each one. The script reports how long each request
 * took, how many failed, how fast host actions reached every page, how soon the big screen showed
 * the final count, and (with a database URL) how many database connections the show used.
 *
 *   node scripts/load-test.ts <preview URL> [--voters 300] [--join 15] [--burst 10]
 *   LOAD_TEST_DATABASE_URL="<direct URL>" node scripts/load-test.ts …   # also counts connections
 *
 * The pages' behaviour is copied from show-events.ts: what each one fetches when its stream opens
 * and on each event, and the phones' spread after a host action. It refuses production (it asks
 * `vercel inspect`): it creates a show (deleted at the end) and makes hundreds of votes.
 *
 * Its times are a little pessimistic: Node's fetch shares HTTP/1.1 connections between every
 * voter and closes idle ones after a few seconds, where each phone keeps its own HTTP/2
 * connection; and the script's own event loop handles 300 pages (its delay is in the report).
 */
// Types only: Node strips them, so none of the app's modules load at run time
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { spawnSync } from "node:child_process";
import { monitorEventLoopDelay } from "node:perf_hooks";
import pg from "pg";

import type { AppRouter } from "../src/server/api/root";
import type { ShowEvent } from "../src/server/events";

type Inputs = inferRouterInputs<AppRouter>["award"];
type Outputs = inferRouterOutputs<AppRouter>["award"];
type Procedure = keyof Outputs;

type Options = { base: string; voters: number; join: number; burst: number };

const USAGE =
  "Usage: node scripts/load-test.ts <preview URL> [--voters 300] [--join 15] [--burst 10]";

/**
 * Refuses anything but a preview (or a local server): asks Vercel which environment the
 * deployment is, as production also answers on deployment URLs that look like a preview's
 */
function assertPreview(url: URL) {
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return;
  const inspect = /^[a-z0-9.-]+$/.test(url.hostname)
    ? spawnSync("vercel", ["inspect", url.hostname], {
        encoding: "utf8",
        shell: process.platform === "win32",
      })
    : undefined;
  const target = /^\s*target\s+(\S+)/m.exec(
    `${inspect?.stdout ?? ""}${inspect?.stderr ?? ""}`,
  )?.[1];
  if (target !== "preview") {
    console.error(
      target
        ? `Refusing to load test ${url.hostname}: it's a ${target} deployment. Use a preview URL.`
        : `Couldn't tell whether ${url.hostname} is a preview (\`vercel inspect\` needs a login and the linked project). Use a preview URL.`,
    );
    process.exit(1);
  }
}

function parseOptions(): Options {
  const [base, ...rest] = process.argv.slice(2);
  if (!base) {
    console.error(USAGE);
    process.exit(1);
  }
  const url = new URL(base);
  assertPreview(url);

  const values = new Map<string, number>();
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i]!;
    const name = flag.replace(/^--/, "");
    if (!flag.startsWith("--") || !["voters", "join", "burst"].includes(name)) {
      console.error(`Unknown option ${flag}\n${USAGE}`);
      process.exit(1);
    }
    const value = Number(rest[i + 1]);
    const whole = name === "voters";
    if (
      !(value > 0) ||
      !Number.isFinite(value) ||
      (whole && !Number.isInteger(value))
    ) {
      console.error(`${flag} needs a positive ${whole ? "whole " : ""}number`);
      process.exit(1);
    }
    values.set(name, value);
  }
  return {
    base: url.origin,
    voters: values.get("voters") ?? 300,
    join: values.get("join") ?? 15,
    burst: values.get("burst") ?? 10,
  };
}

const options = parseOptions();
const started = Date.now();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const random = (max: number) => Math.random() * max;
const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)} s`;
/** Stops every page at the end (and before the show is deleted) */
const stopAll = new AbortController();
const stopped = () => stopAll.signal.aborted;

// ---------------------------------------------------------------------------------------------
// Measurements

type Timing = { ms: number[]; failures: Map<string, number> };
const timings = new Map<string, Timing>();

function timing(name: string) {
  let found = timings.get(name);
  if (!found) {
    found = { ms: [], failures: new Map() };
    timings.set(name, found);
  }
  return found;
}

function fail(call: Timing, error: unknown) {
  const reason = error instanceof Error ? error.message : String(error);
  call.failures.set(reason, (call.failures.get(reason) ?? 0) + 1);
}

function quantiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99), max: sorted.at(-1) };
}

/** How late the script's own timers run: if this is high, its times include its own queue */
const loopDelay = monitorEventLoopDelay();
loopDelay.enable();

// ---------------------------------------------------------------------------------------------
// Talking to the app as a browser would: tRPC over HTTP with a cookie jar per person

type Person = { name: string; cookies: Map<string, string> };

const person = (name: string): Person => ({ name, cookies: new Map() });

function keepCookies(who: Person, res: Response) {
  for (const header of res.headers.getSetCookie()) {
    const [pair = ""] = header.split(";");
    const at = pair.indexOf("=");
    who.cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
}

const cookieHeader = (who: Person) =>
  [...who.cookies].map(([key, value]) => `${key}=${value}`).join("; ");

/** Calls a procedure, timing it under its name. Mutations are POSTs, queries GETs. */
async function trpc<P extends Procedure>(
  who: Person,
  kind: "query" | "mutation",
  path: P,
  input: Inputs[P],
): Promise<Outputs[P]> {
  const call = timing(path);
  const json = JSON.stringify({ json: input });
  const url =
    kind === "query"
      ? `${options.base}/api/trpc/award.${path}?input=${encodeURIComponent(json)}`
      : `${options.base}/api/trpc/award.${path}`;
  const at = performance.now();
  try {
    const res = await fetch(url, {
      method: kind === "query" ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(who),
      },
      body: kind === "mutation" ? json : undefined,
    });
    keepCookies(who, res);
    const text = await res.text();
    let body: {
      result?: { data: { json: Outputs[P] } };
      error?: { json: { message: string } };
    };
    try {
      body = JSON.parse(text) as typeof body;
    } catch {
      // Not the app's answer: Vercel's own error page, a firewall or a protected preview
      throw new Error(
        `${res.status} ${text.slice(0, 60).replace(/\s+/g, " ")}`,
      );
    }
    if (!res.ok || !body.result) {
      throw new Error(`${res.status} ${body.error?.json.message ?? ""}`.trim());
    }
    call.ms.push(performance.now() - at);
    return body.result.data.json;
  } catch (error) {
    fail(call, error);
    throw error;
  }
}

/** Loads a page's HTML, as opening the link would (and gets the voter's device cookie) */
async function loadPage(who: Person, path: string) {
  const call = timing(`page ${path.split("/")[1]}`);
  const at = performance.now();
  try {
    const res = await fetch(`${options.base}${path}`, {
      headers: { cookie: cookieHeader(who) },
    });
    keepCookies(who, res);
    await res.arrayBuffer();
    if (!res.ok) throw new Error(String(res.status));
    call.ms.push(performance.now() - at);
  } catch (error) {
    fail(call, error);
  }
}

let openStreams = 0;

/**
 * Listens to the show's events as EventSource would, connecting again when the stream ends.
 * `onOpen` runs each time it opens, as the pages fetch everything then.
 */
function listen(
  who: Person,
  code: string,
  votes: boolean,
  onOpen: () => void,
  onEvent: (event: ShowEvent) => void,
) {
  const url = `${options.base}/api/shows/${code}/events${votes ? "" : "?votes=0"}`;
  const open = timing("stream opens");

  void (async () => {
    while (!stopped()) {
      const at = performance.now();
      let opened = false;
      try {
        const res = await fetch(url, {
          headers: { cookie: cookieHeader(who), accept: "text/event-stream" },
          signal: stopAll.signal,
        });
        if (!res.ok || !res.body) throw new Error(String(res.status));
        open.ms.push(performance.now() - at);
        opened = true;
        openStreams++;
        onOpen();
        let buffer = "";
        for await (const chunk of res.body.pipeThrough(
          new TextDecoderStream(),
        )) {
          buffer += chunk;
          let end;
          while ((end = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, end).split("\n");
            buffer = buffer.slice(end + 2);
            const type = block
              .find(line => line.startsWith("event: "))
              ?.slice(7);
            const data = block
              .find(line => line.startsWith("data: "))
              ?.slice(6);
            if (type === "show") onEvent({ type });
            if (type === "votes" && data) {
              const { categoryId } = JSON.parse(data) as { categoryId: string };
              onEvent({ type, categoryId });
            }
          }
        }
      } catch (error) {
        if (stopped()) break;
        if (!opened) fail(open, error);
      } finally {
        if (opened) openStreams--;
      }
      // EventSource's retry, which the server sets to 1–2 s
      await sleep(1000 + random(1000));
    }
  })();
}

// ---------------------------------------------------------------------------------------------
// How fast each host action reaches the pages

type Step = { name: string; at: number; reached: Map<string, number> };
const steps: Step[] = [];
let currentStep: Step | undefined;

function heard(who: Person) {
  if (currentStep && !currentStep.reached.has(who.name)) {
    currentStep.reached.set(who.name, performance.now() - currentStep.at);
  }
}

// ---------------------------------------------------------------------------------------------
// The show

const host = person("host");
const show = await trpc(host, "mutation", "createSession", {
  name: "Load test",
  password: `load-test-${Math.random().toString(36).slice(2)}`,
});
console.log(`${elapsed()}  show ${show.code} on ${options.base}`);

/** Deletes the show, also when the script fails or is stopped */
async function endShow() {
  // Phones would fetch the deleted show again: leave that out of the report
  stopAll.abort();
  await trpc(host, "mutation", "deleteSession", { id: show.id }).catch(error =>
    console.error(`Couldn't delete show ${show.code}:`, error),
  );
}
const stop = (error?: unknown) => {
  if (error) console.error(error);
  void endShow().finally(() => process.exit(1));
};
process.once("SIGINT", () => stop());
process.once("uncaughtException", stop);
process.once("unhandledRejection", stop);

type CategoryType = "NORMAL" | "RANKING";

async function addCategory(name: string, type: CategoryType, names: string[]) {
  const category = await trpc(host, "mutation", "addCategory", {
    sessionId: show.id,
    name,
    type,
    sourceCategories: [],
    ...(type === "RANKING" ? { rankingTop: 3 } : {}),
  });
  const nominations = [];
  for (const nomination of names) {
    nominations.push(
      await trpc(host, "mutation", "addNomination", {
        categoryId: category.id,
        name: nomination,
      }),
    );
  }
  return { id: category.id, type, nominations };
}

const categories = [
  await addCategory("Best Film", "NORMAL", [
    "Dune",
    "Barbie",
    "Oppenheimer",
    "Past Lives",
    "Poor Things",
    "Anatomy of a Fall",
  ]),
  await addCategory("Best Song", "RANKING", [
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
  ]),
];
type ShowCategory = (typeof categories)[number];

// ---------------------------------------------------------------------------------------------
// Database connections, sampled every second while the show runs

const database = process.env.LOAD_TEST_DATABASE_URL;
const connections = {
  samples: 0,
  before: 0,
  maxTotal: 0,
  maxActive: 0,
  maxListening: 0,
  limit: 0,
  failed: undefined as string | undefined,
};
const sampler = database
  ? (async () => {
      const client = new pg.Client({ connectionString: database });
      await client.connect();
      const limit = await client.query<{ max_connections: string }>(
        "SHOW max_connections",
      );
      connections.limit = Number(limit.rows[0]?.max_connections);
      while (!stopped()) {
        // event-hub.ts names its connections awardbro-events
        const { rows } = await client.query<{
          total: number;
          listening: number;
          active: number;
        }>(
          `SELECT count(*)::int AS total,
                  count(*) FILTER (WHERE application_name = 'awardbro-events')::int AS listening,
                  count(*) FILTER (WHERE state = 'active')::int AS active
             FROM pg_stat_activity
            WHERE backend_type = 'client backend' AND pid <> pg_backend_pid()`,
        );
        const [row] = rows;
        if (row) {
          if (connections.samples === 0) connections.before = row.total;
          connections.samples++;
          connections.maxTotal = Math.max(connections.maxTotal, row.total);
          connections.maxActive = Math.max(connections.maxActive, row.active);
          connections.maxListening = Math.max(
            connections.maxListening,
            row.listening,
          );
        }
        await sleep(1000);
      }
      await client.end();
    })().catch((error: unknown) => {
      // A failed sample stops sampling, not the show
      connections.failed = String(error);
    })
  : undefined;

// ---------------------------------------------------------------------------------------------
// The big screen and the host's run view: every vote updates their count

type Screen = {
  counts: Map<string, { count: number; at: number }>;
  countFetches: number;
};

function screen(who: Person, sessionInput: Inputs["getSession"]): Screen {
  const view: Screen = { counts: new Map(), countFetches: 0 };
  const fetchCount = (categoryId: string) => {
    view.countFetches++;
    trpc(who, "query", "getCategory", { id: categoryId }).then(
      category => {
        // Keeps when the screen first showed each count (the public get none after the reveal)
        const count = category.estimatedVoters;
        if (count !== null && view.counts.get(categoryId)?.count !== count) {
          view.counts.set(categoryId, { count, at: Date.now() });
        }
      },
      () => undefined,
    );
  };
  const fetchShow = () =>
    trpc(who, "query", "getSession", sessionInput).then(
      session =>
        session.categories
          .filter(c => c.isActive)
          .forEach(c => fetchCount(c.id)),
      () => undefined,
    );
  listen(
    who,
    show.code,
    true,
    () => void fetchShow(),
    event => {
      if (event.type === "show") {
        heard(who);
        void fetchShow();
      } else fetchCount(event.categoryId);
    },
  );
  return view;
}

const runView = screen(host, { code: show.code });
const bigScreen = screen(person("big screen"), {
  code: show.code,
  activeOnly: true,
});

// ---------------------------------------------------------------------------------------------
// The voters

const voted = new Map<string, Set<string>>(
  categories.map(c => [c.id, new Set()]),
);
let changedVotes = 0;
/** When each category's last first vote was saved (a changed vote doesn't change the count) */
const lastVoteSaved = new Map<string, number>();

function shuffled<T>(items: T[]) {
  return items
    .map(item => ({ item, key: Math.random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

async function voter(index: number) {
  const who = person(`voter ${index}`);
  const handled = new Set<string>();
  const fetchMyVotes = (categoryId: string) =>
    trpc(who, "query", "getMyVotes", { categoryId }).catch(() => undefined);

  // What the phone does when it hears of a change: fetch the show and its own votes, then vote
  // once if a category has just opened
  const refresh = async () => {
    if (stopped()) return;
    const session = await trpc(who, "query", "getSession", {
      code: show.code,
      activeOnly: true,
    }).catch(() => undefined);
    const active = session?.categories[0];
    if (!active) return;
    await fetchMyVotes(active.id);
    const category = categories.find(c => c.id === active.id);
    if (
      category &&
      active.isActive &&
      !active.votingClosed &&
      !handled.has(category.id)
    ) {
      handled.add(category.id);
      void vote(category);
    }
  };

  const vote = async (category: ShowCategory) => {
    // People take a while to pick
    await sleep(random(options.burst * 1000));
    const picks = shuffled(category.nominations);
    let first: (typeof picks)[number] | undefined;
    try {
      if (category.type === "NORMAL") {
        // A few favourites, so there's a winner
        first = Math.random() < 0.5 ? category.nominations[0]! : picks[0]!;
        await trpc(who, "mutation", "vote", { nominationId: first.id });
      } else {
        await trpc(who, "mutation", "submitRanking", {
          categoryId: category.id,
          rankings: picks
            .slice(0, 3)
            .map((n, i) => ({ nominationId: n.id, rank: i + 1 })),
        });
      }
      voted.get(category.id)!.add(who.name);
      lastVoteSaved.set(category.id, Date.now());
      await fetchMyVotes(category.id);
      if (category.type === "NORMAL" && Math.random() < 0.15) {
        await sleep(1000 + random(3000));
        const other = picks.find(n => n !== first)!;
        await trpc(who, "mutation", "vote", { nominationId: other.id });
        changedVotes++;
        await fetchMyVotes(category.id);
      }
    } catch {
      // Counted in the request's failures
    }
  };

  await loadPage(who, `/vote/${show.code}`);
  listen(
    who,
    show.code,
    false,
    () => void refresh(),
    () => {
      heard(who);
      // Phones spread their fetches over a second after a host action (`crowd`)
      setTimeout(() => void refresh(), random(1000));
    },
  );
}

console.log(
  `${elapsed()}  ${options.voters} voters joining over ${options.join} s`,
);
for (let i = 0; i < options.voters; i++) {
  void voter(i);
  await sleep((options.join * 1000) / options.voters);
}
await sleep(5000);
const listeners = options.voters + 2;
console.log(`${elapsed()}  ${openStreams}/${listeners} streams open`);

async function hostStep(
  name: string,
  categoryId: string,
  stage: Inputs["setCategoryStage"]["stage"],
  from: Inputs["setCategoryStage"]["from"],
) {
  const step: Step = { name, at: performance.now(), reached: new Map() };
  steps.push(step);
  currentStep = step;
  await trpc(host, "mutation", "setCategoryStage", {
    id: categoryId,
    stage,
    from,
  });
  console.log(`${elapsed()}  ${name}`);
}

for (const category of categories) {
  const label = category.type === "NORMAL" ? "normal" : "ranking";
  await hostStep(`open ${label}`, category.id, "open", "ready");
  // The phones' spread (1 s), the burst, the vote changes (up to 4 s later), then a few seconds
  // for the last requests and counts
  await sleep(options.burst * 1000 + 9000);
  await hostStep(`close ${label}`, category.id, "closed", "open");
  await sleep(3000);
  await hostStep(`reveal ${label}`, category.id, "revealed", "closed");
  await sleep(3000);
  await hostStep(`next after ${label}`, category.id, "off", "revealed");
  await sleep(3000);
}
currentStep = undefined;

// ---------------------------------------------------------------------------------------------
// The report

const final = await Promise.all(
  categories.map(c => trpc(host, "query", "getCategory", { id: c.id })),
);
await endShow();
await sampler;
loopDelay.disable();

const ms = (value: number | undefined) =>
  value === undefined ? "-" : `${Math.round(value)}`;

console.log(`\nRequests (ms)`);
console.table(
  Object.fromEntries(
    [...timings].map(([name, { ms: values, failures }]) => {
      const q = quantiles(values);
      const failed = [...failures.values()].reduce((a, b) => a + b, 0);
      return [
        name,
        {
          ok: values.length,
          failed,
          p50: ms(q.p50),
          p95: ms(q.p95),
          p99: ms(q.p99),
          max: ms(q.max),
        },
      ];
    }),
  ),
);
for (const [name, { failures }] of timings) {
  for (const [reason, count] of failures)
    console.log(`  ${name} failed ${count}×: ${reason}`);
}

console.log(
  `\nHost actions reaching the ${listeners} pages (ms after the host clicked)`,
);
console.table(
  Object.fromEntries(
    steps.map(step => {
      const q = quantiles([...step.reached.values()]);
      return [
        step.name,
        {
          reached: step.reached.size,
          p50: ms(q.p50),
          p95: ms(q.p95),
          max: ms(q.max),
        },
      ];
    }),
  ),
);

console.log(`\nCounts`);
categories.forEach((category, i) => {
  const expected = voted.get(category.id)!.size;
  const shown = bigScreen.counts.get(category.id);
  console.log(
    `  ${category.type}: ${expected} voters' votes saved, the server counts ${final[i]!.estimatedVoters}, ` +
      `the big screen last showed ${shown?.count ?? "nothing"}` +
      (shown?.count === expected
        ? `, ${ms(shown.at - (lastVoteSaved.get(category.id) ?? shown.at))} ms after the last vote`
        : ""),
  );
});
console.log(`  ${changedVotes} votes changed`);
console.log(
  `  count fetches: big screen ${bigScreen.countFetches}, run view ${runView.countFetches}`,
);
// The histogram is in nanoseconds
console.log(
  `\nThe script's event loop delay: p99 ${ms(loopDelay.percentile(99) / 1e6)} ms, max ${ms(loopDelay.max / 1e6)} ms`,
);

if (connections.failed) {
  console.log(`\nStopped sampling connections: ${connections.failed}`);
}
if (database) {
  console.log(
    `\nDatabase connections (${connections.samples} samples, limit ${connections.limit}): ` +
      `${connections.before} open at the start, at most ${connections.maxTotal}, ${connections.maxActive} active, ${connections.maxListening} listening`,
  );
}
process.exit(0);
