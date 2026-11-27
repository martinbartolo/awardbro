/**
 * The database the integration and end-to-end tests use. The integration tests empty every table
 * before each test, so both only run against a database whose name ends in `_test`. The shared `dev` and production databases
 * are both called `neondb`, so a wrong URL fails here before anything is touched.
 */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Set TEST_DATABASE_URL to an empty Postgres database whose name ends in _test. See docs/development.md.",
    );
  }

  const name = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!name.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against database "${name}": the integration tests delete all its data. Use a database whose name ends in _test.`,
    );
  }
  return url;
}
