import { describe, expect, it } from "vitest";

import { normalizeRoomCode } from "./join";

describe("normalizeRoomCode", () => {
  it("ignores case and spaces", () => {
    expect(normalizeRoomCode(" g3 4r ")).toBe("G34R");
  });

  it.each([
    "awardbro.com/vote/g34r",
    "https://awardbro.com/vote/G34R/",
    "https://awardbro.com/vote/G34R?x=1#top",
  ])("reads the code from the link %s", link => {
    expect(normalizeRoomCode(link)).toBe("G34R");
  });
});
