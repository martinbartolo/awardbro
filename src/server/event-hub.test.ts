import { describe, expect, it } from "vitest";

import { listenerConnectionString } from "./event-hub";

const params = (connectionString: string) =>
  Object.fromEntries(
    new URL(listenerConnectionString(connectionString)).searchParams,
  );

describe("listenerConnectionString", () => {
  it("names the connection, over a name in the string", () => {
    expect(params("postgresql://u:p@localhost:5432/awardbro_test")).toEqual({
      application_name: "awardbro-events",
    });
    expect(
      params("postgresql://u:p@host/db?application_name=neon").application_name,
    ).toBe("awardbro-events");
  });

  it("asks for verify-full instead of the modes pg treats as it", () => {
    for (const mode of ["prefer", "require", "verify-ca"]) {
      expect(
        params(
          `postgresql://u:p@host/db?sslmode=${mode}&channel_binding=require`,
        ),
      ).toEqual({
        sslmode: "verify-full",
        channel_binding: "require",
        application_name: "awardbro-events",
      });
    }
  });

  it("leaves other modes, and libpq's meaning of them, alone", () => {
    expect(params("postgresql://u:p@host/db?sslmode=disable").sslmode).toBe(
      "disable",
    );
    expect(
      params("postgresql://u:p@host/db?sslmode=require&uselibpqcompat=true")
        .sslmode,
    ).toBe("require");
  });

  it("keeps the rest of the string", () => {
    const url = new URL(
      listenerConnectionString("postgresql://user:pa%40ss@host:5433/neondb"),
    );
    expect([url.username, url.password, url.host, url.pathname]).toEqual([
      "user",
      "pa%40ss",
      "host:5433",
      "/neondb",
    ]);
  });
});
