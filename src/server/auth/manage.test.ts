import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canManage,
  cookieName,
  createManageToken,
  getCookie,
  isValidManageToken,
  MAX_AGE_SECONDS,
  setManageCookie,
} from "./manage";

// manage.ts imports the database client for its server helpers; these tests don't use it
vi.mock("~/server/db", () => ({ db: {} }));

const SESSION_ID = "session-a";

/** Cookie lookup that returns `token` only for the given show's manage cookie. */
const cookieFor = (sessionId: string, token: string) => (name: string) =>
  name === cookieName(sessionId) ? token : undefined;

afterEach(() => {
  vi.useRealTimers();
});

describe("manage tokens", () => {
  it("accepts a token for the session it was created for", () => {
    const token = createManageToken(SESSION_ID);
    expect(isValidManageToken(SESSION_ID, token)).toBe(true);
  });

  it("rejects a token created for another session", () => {
    const token = createManageToken("session-b");
    expect(isValidManageToken(SESSION_ID, token)).toBe(false);
  });

  it("rejects a missing, malformed or tampered token", () => {
    const token = createManageToken(SESSION_ID);
    const [expiresAt, signature] = token.split(".");

    expect(isValidManageToken(SESSION_ID, undefined)).toBe(false);
    expect(isValidManageToken(SESSION_ID, "")).toBe(false);
    expect(isValidManageToken(SESSION_ID, "not-a-token")).toBe(false);
    expect(isValidManageToken(SESSION_ID, `${expiresAt}.`)).toBe(false);
    // Extending the expiry invalidates the signature
    expect(
      isValidManageToken(SESSION_ID, `${Number(expiresAt) + 1}.${signature}`),
    ).toBe(false);
    expect(isValidManageToken(SESSION_ID, `${expiresAt}.${signature}x`)).toBe(
      false,
    );
  });

  it("rejects an expired token", () => {
    const token = createManageToken(SESSION_ID);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + (MAX_AGE_SECONDS + 60) * 1000);
    expect(isValidManageToken(SESSION_ID, token)).toBe(false);
  });
});

describe("canManage", () => {
  const noCookies = () => undefined;

  it("allows anyone to manage a show without a password", () => {
    expect(canManage({ id: SESSION_ID, password: null }, noCookies)).toBe(true);
  });

  it("requires this show's cookie for a password-protected show", () => {
    const session = { id: SESSION_ID, password: "bcrypt-hash" };

    expect(canManage(session, noCookies)).toBe(false);
    expect(
      canManage(session, cookieFor(SESSION_ID, createManageToken(SESSION_ID))),
    ).toBe(true);
    // Another show's valid cookie doesn't grant access
    expect(
      canManage(
        session,
        cookieFor("session-b", createManageToken("session-b")),
      ),
    ).toBe(false);
  });
});

describe("cookies", () => {
  it("sets an httpOnly cookie that grants access when sent back", () => {
    const response = new Headers();
    setManageCookie(response, SESSION_ID);

    const setCookie = response.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    // Round trip: the browser sends back the name=value pair
    const request = new Headers({ cookie: setCookie.split(";")[0]! });
    expect(
      canManage({ id: SESSION_ID, password: "bcrypt-hash" }, name =>
        getCookie(request, name),
      ),
    ).toBe(true);
  });

  it("reads a cookie by exact name", () => {
    const headers = new Headers({
      cookie: "device_id=abc; manage_x=1.sig; manage_xy=2.sig",
    });
    expect(getCookie(headers, "manage_x")).toBe("1.sig");
    expect(getCookie(headers, "device_id")).toBe("abc");
    expect(getCookie(headers, "missing")).toBeUndefined();
    expect(getCookie(new Headers(), "manage_x")).toBeUndefined();
  });
});
