import { describe, expect, it } from "vitest";

import { getImageUrl, isImageUrl, isValidImageUrl } from "./images";

const driveLink = "https://drive.google.com/file/d/1AbC-d_9/view?usp=sharing";

describe("isImageUrl", () => {
  it.each([
    "https://example.com/cat.jpg",
    "https://example.com/cat.JPEG",
    "https://example.com/cat.png?width=200",
    "https://i.imgur.com/abc.webp",
    "https://example.com/icon.svg",
    driveLink,
  ])("accepts %s", url => {
    expect(isImageUrl(url)).toBe(true);
  });

  it.each([
    "Best Picture",
    "https://example.com/page",
    "https://example.com/cat.jpg.html",
    "https://drive.google.com/drive/folders/abc",
  ])("rejects %s", url => {
    expect(isImageUrl(url)).toBe(false);
  });
});

describe("isValidImageUrl", () => {
  it("accepts a full image URL", () => {
    expect(isValidImageUrl("https://example.com/cat.png")).toBe(true);
    expect(isValidImageUrl(driveLink)).toBe(true);
  });

  it("rejects text that only ends like an image", () => {
    expect(isValidImageUrl("cat.png")).toBe(false);
  });

  it("rejects a URL that isn't an image", () => {
    expect(isValidImageUrl("https://example.com/page")).toBe(false);
  });
});

describe("getImageUrl", () => {
  it("turns a Google Drive file link into a thumbnail URL", () => {
    expect(getImageUrl(driveLink)).toBe(
      "https://drive.google.com/thumbnail?id=1AbC-d_9&sz=w1600",
    );
  });

  it("returns an empty string for a Drive link without a file ID", () => {
    expect(getImageUrl("https://drive.google.com/file/d/")).toBe("");
  });

  it("leaves other URLs unchanged", () => {
    expect(getImageUrl("https://example.com/cat.png")).toBe(
      "https://example.com/cat.png",
    );
  });
});
