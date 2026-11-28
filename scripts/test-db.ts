/* eslint-disable no-console -- a command-line tool */
/**
 * A Postgres server for the integration and end-to-end tests, started only when they need it
 * (nothing runs at startup). It uses the installed Postgres programs, with its data in your home
 * folder (`~/.awardbro/test-postgres`), on port 5433, and has the `awardbro_test` database.
 *
 *   node scripts/test-db.ts start    # creates it the first time; prints TEST_DATABASE_URL
 *   node scripts/test-db.ts stop
 *
 * Its password is a fixed test value, as in CI: it only holds test data and only listens on
 * localhost.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const PORT = 5433;
const PASSWORD = "postgres";
const DATABASE = "awardbro_test";
const DATA = join(homedir(), ".awardbro", "test-postgres");
const LOG = join(DATA, "server.log");
const URL = `postgresql://postgres:${PASSWORD}@localhost:${PORT}/${DATABASE}`;
const EXE = process.platform === "win32" ? ".exe" : "";

/** A problem to report in one line, without a stack trace */
class Failure extends Error {}

/**
 * Where installers put Postgres's programs, by major version: Windows, Homebrew (which doesn't
 * add them to the PATH) and Debian or Ubuntu
 */
function installs() {
  const found = new Map<number, string>();
  const look = (parent: string, bin: (entry: string) => string) => {
    if (!existsSync(parent)) return;
    for (const entry of readdirSync(parent)) {
      const major = parseInt(/(\d+)/.exec(entry)?.[1] ?? "", 10);
      const dir = bin(entry);
      if (major && !found.has(major) && existsSync(join(dir, `pg_ctl${EXE}`))) {
        found.set(major, dir);
      }
    }
  };
  look("C:\\Program Files\\PostgreSQL", entry =>
    join("C:\\Program Files\\PostgreSQL", entry, "bin"),
  );
  for (const brew of ["/opt/homebrew/opt", "/usr/local/opt"]) {
    look(brew, entry =>
      entry.startsWith("postgresql") ? join(brew, entry, "bin") : "",
    );
  }
  look("/usr/lib/postgresql", entry =>
    join("/usr/lib/postgresql", entry, "bin"),
  );
  return found;
}

/**
 * The folder with pg_ctl and initdb: PG_BIN if set, else the install of the version the data
 * was created with (another version can't open it), else the newest install, else the PATH
 */
function binaries() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const found = installs();
  const versionFile = join(DATA, "PG_VERSION");
  if (existsSync(versionFile)) {
    const created = parseInt(readFileSync(versionFile, "utf8"), 10);
    const dir = found.get(created);
    if (dir) return dir;
    if (found.size) {
      throw new Failure(
        `The test database was created with Postgres ${created}, which isn't installed any more. Delete ${DATA} and start again to re-create it.`,
      );
    }
  }
  const newest = Math.max(...found.keys());
  return found.get(newest) ?? "";
}

/**
 * Runs one of Postgres's programs and returns its exit status. `quiet` hides its output;
 * `detached` gives it no output to hold on to, for `pg_ctl start`: the server it starts would
 * otherwise keep this script's output open, and the script would wait for it to close.
 */
function run(
  program: string,
  args: string[],
  { quiet = false, detached = false } = {},
) {
  const bin = binaries();
  const result = spawnSync(bin ? join(bin, program) : program, args, {
    encoding: "utf8",
    stdio: detached ? "ignore" : quiet ? "pipe" : "inherit",
  });
  if (result.error) {
    throw new Failure(
      `Couldn't run ${program}: install Postgres (see "Integration tests" in docs/development.md), or set PG_BIN to the folder with its programs.`,
    );
  }
  return result.status ?? 1;
}

const isRunning = () =>
  run("pg_ctl", ["status", "-D", DATA], { quiet: true }) === 0;

function create() {
  console.log(`Creating the test database server in ${DATA}`);
  rmSync(DATA, { recursive: true, force: true });
  mkdirSync(DATA, { recursive: true });
  const passwordFile = join(tmpdir(), `awardbro-test-db-${process.pid}`);
  writeFileSync(passwordFile, PASSWORD);
  try {
    const status = run("initdb", [
      "-D",
      DATA,
      "-U",
      "postgres",
      "-E",
      "UTF8",
      "--auth=scram-sha-256",
      `--pwfile=${passwordFile}`,
    ]);
    if (status !== 0) throw new Failure("initdb failed (see above).");
  } finally {
    rmSync(passwordFile, { force: true });
  }
}

async function start() {
  if (!existsSync(join(DATA, "PG_VERSION"))) create();

  if (!isRunning()) {
    const status = run(
      "pg_ctl",
      [
        "start",
        "-D",
        DATA,
        "-w",
        "-l",
        LOG,
        // Only on this machine
        "-o",
        `-p ${PORT} -c listen_addresses=localhost`,
      ],
      { detached: true },
    );
    if (status !== 0) {
      throw new Failure(`The test database didn't start: see ${LOG}`);
    }
  }

  const client = new pg.Client({
    connectionString: URL.replace(`/${DATABASE}`, "/postgres"),
  });
  try {
    await client.connect();
    const { rowCount } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DATABASE],
    );
    if (!rowCount) await client.query(`CREATE DATABASE ${DATABASE}`);
  } catch (error) {
    throw new Failure(
      `The test database is running but can't be reached on port ${PORT} (${String(error)}). See ${LOG}, or stop it and start it again.`,
    );
  } finally {
    await client.end().catch(() => undefined);
  }

  const set =
    process.platform === "win32"
      ? `$env:TEST_DATABASE_URL = "${URL}"    # PowerShell\n  export TEST_DATABASE_URL="${URL}"   # Git Bash`
      : `export TEST_DATABASE_URL="${URL}"`;
  console.log(`Test database ready. Run the tests with:\n\n  ${set}\n`);
}

function stop() {
  if (!isRunning()) {
    console.log("The test database isn't running.");
    return;
  }
  const status = run("pg_ctl", ["stop", "-D", DATA, "-m", "fast"]);
  if (status !== 0) throw new Failure("The test database didn't stop.");
}

try {
  const command = process.argv[2];
  if (command === "start") await start();
  else if (command === "stop") stop();
  else throw new Failure("Usage: node scripts/test-db.ts start|stop");
} catch (error) {
  if (!(error instanceof Failure)) throw error;
  console.error(error.message);
  process.exit(1);
}
