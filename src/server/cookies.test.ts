import { describe, expect, it } from "vitest";

import { getCookie } from "./cookies";

describe("getCookie", () => {
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
