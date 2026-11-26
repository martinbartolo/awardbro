import { describe, expect, it } from "vitest";

import {
  imageAddress,
  isImageUrl,
  parseImageLink,
  showsPictures,
} from "./images";

const urlOf = (link: string) => {
  const parsed = parseImageLink(link);
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.url;
};

const errorOf = (link: string) => {
  const parsed = parseImageLink(link);
  return "error" in parsed ? parsed.error : null;
};

describe("parseImageLink", () => {
  it("keeps a direct picture address", () => {
    expect(urlOf("https://example.com/cat.png?w=200")).toBe(
      "https://example.com/cat.png?w=200",
    );
  });

  it("keeps any other https link, whatever it ends in, for the preview to try", () => {
    expect(urlOf("https://images.example.com/photo/123")).toBe(
      "https://images.example.com/photo/123",
    );
  });

  it("trims spaces and turns http into https", () => {
    expect(urlOf("  http://example.com/cat.jpg ")).toBe(
      "https://example.com/cat.jpg",
    );
  });

  it.each([
    [
      "Google Drive file",
      "https://drive.google.com/file/d/1AbC-d_9/view?usp=sharing",
    ],
    ["Google Drive open link", "https://drive.google.com/open?id=1AbC-d_9"],
    [
      "Google Drive download link",
      "https://drive.google.com/uc?export=download&id=1AbC-d_9",
    ],
  ])("turns a %s into Drive's thumbnail address", (_, link) => {
    expect(urlOf(link)).toBe(
      "https://drive.google.com/thumbnail?id=1AbC-d_9&sz=w1600",
    );
  });

  it.each([
    ["https://imgur.com/AbC12xY", "https://i.imgur.com/AbC12xY.jpg"],
    ["https://www.imgur.com/AbC12xY", "https://i.imgur.com/AbC12xY.jpg"],
    ["https://m.imgur.com/AbC12xY", "https://i.imgur.com/AbC12xY.jpg"],
    ["https://imgur.com/AbC12xY.png", "https://i.imgur.com/AbC12xY.png"],
    ["https://imgur.com/AbC12xY.gifv", "https://i.imgur.com/AbC12xY.gif"],
  ])("turns the imgur page %s into the picture's address", (link, url) => {
    expect(urlOf(link)).toBe(url);
  });

  it("keeps an imgur address that isn't a picture's page, for the preview to try", () => {
    expect(urlOf("https://imgur.com/upload")).toBe("https://imgur.com/upload");
  });

  it.each([
    [
      "https://www.dropbox.com/scl/fi/abc123/cat.jpg?rlkey=xyz&dl=0",
      "https://www.dropbox.com/scl/fi/abc123/cat.jpg?rlkey=xyz&raw=1",
    ],
    [
      "https://www.dropbox.com/s/abc123/cat.jpg?dl=0",
      "https://www.dropbox.com/s/abc123/cat.jpg?raw=1",
    ],
  ])("turns the Dropbox share link %s into the raw file", (link, url) => {
    expect(urlOf(link)).toBe(url);
  });

  it("keeps a Google Drive file's resource key", () => {
    expect(
      urlOf("https://drive.google.com/file/d/1AbC-d_9/view?resourcekey=0-xyz"),
    ).toBe(
      "https://drive.google.com/thumbnail?id=1AbC-d_9&sz=w1600&resourcekey=0-xyz",
    );
  });

  it.each([
    "https://onedrive.live.com/embed?resid=ABC%21123&authkey=xyz",
    "https://contoso.sharepoint.com/sites/team/Shared%20Documents/cat.jpg",
  ])("keeps the OneDrive or SharePoint address %s as it is", link => {
    expect(urlOf(link)).toBe(link);
  });

  it("refuses a link that would be too long to store", () => {
    expect(errorOf(`https://1drv.ms/i/s!${"a".repeat(400)}`)).toMatch(
      /too long/,
    );
  });

  it("turns a OneDrive share link into the file's content through the sharing API", () => {
    // The encoding OneDrive documents: base64url of the share link, without padding, after "u!"
    expect(urlOf("https://1drv.ms/i/s!AkHd3fE")).toBe(
      `https://api.onedrive.com/v1.0/shares/u!${Buffer.from("https://1drv.ms/i/s!AkHd3fE").toString("base64url")}/root/content`,
    );
  });

  it.each([
    "https://example.com/cat.png",
    "https://drive.google.com/file/d/1AbC-d_9/view",
    "https://imgur.com/AbC12xY",
    "https://www.dropbox.com/scl/fi/abc123/cat.jpg?rlkey=xyz&dl=0",
    "https://1drv.ms/i/s!AkHd3fE",
  ])("gives the same address when converting its own result (%s)", link => {
    const url = urlOf(link);
    expect(urlOf(url)).toBe(url);
  });

  it.each([
    ["Google Photos", "https://photos.app.goo.gl/AbC123"],
    ["Google Photos", "https://photos.google.com/share/AbC123"],
    ["iCloud", "https://www.icloud.com/sharedalbum/#B0abc"],
  ])("says %s links need a sign-in", (site, link) => {
    expect(errorOf(link)).toMatch(new RegExp(`^${site} links only open`));
  });

  it.each([
    ["an imgur album", "https://imgur.com/a/AbC12xY", /imgur album/],
    [
      "an imgur gallery",
      "https://imgur.com/gallery/cats-AbC12xY",
      /imgur album/,
    ],
    ["a Drive folder", "https://drive.google.com/drive/folders/abc", /folder/],
  ])("explains why %s isn't a picture", (_, link, message) => {
    expect(errorOf(link)).toMatch(message);
    expect(errorOf(link)).toMatch(/Copy image address/);
  });

  it.each(["", "   ", "cat.png", "Best Picture", "ftp://example.com/cat.png"])(
    "refuses %j, which isn't a link",
    link => {
      expect(errorOf(link)).not.toBeNull();
    },
  );
});

describe("imageAddress", () => {
  it("gives the address to load a picture from", () => {
    expect(imageAddress("https://imgur.com/AbC12xY")).toBe(
      "https://i.imgur.com/AbC12xY.jpg",
    );
  });

  it.each(["", "Best Picture", "https://photos.app.goo.gl/AbC123"])(
    "gives nothing for %j, which can't be a picture",
    link => {
      expect(imageAddress(link)).toBeNull();
    },
  );
});

describe("showsPictures", () => {
  const image = { type: "IMAGE" };
  const normal = { type: "NORMAL" };

  it("is true for an image category and an aggregate of only image categories", () => {
    expect(showsPictures(image)).toBe(true);
    expect(
      showsPictures({ type: "AGGREGATE", sourceCategories: [image, image] }),
    ).toBe(true);
  });

  it("is false for other categories and an aggregate with other sources", () => {
    expect(showsPictures(normal)).toBe(false);
    expect(
      showsPictures({ type: "AGGREGATE", sourceCategories: [image, normal] }),
    ).toBe(false);
    expect(showsPictures({ type: "AGGREGATE", sourceCategories: [] })).toBe(
      false,
    );
  });
});

describe("isImageUrl", () => {
  it.each([
    "https://example.com/cat.jpg",
    "https://example.com/cat.JPEG",
    "https://example.com/cat.png?width=200",
    "https://drive.google.com/file/d/1AbC-d_9/view?usp=sharing",
    "https://drive.google.com/thumbnail?id=1AbC-d_9&sz=w1600",
    "https://i.imgur.com/AbC12xY.jpg",
    "https://drive.google.com/open?id=1AbC-d_9",
  ])("recognises the picture link %s", text => {
    expect(isImageUrl(text)).toBe(true);
  });

  it.each([
    "Best Picture",
    "https://example.com/page",
    "https://example.com/cat.jpg.html",
    "https://drive.google.com/drive/folders/abc",
    "cat.png",
    // A video or document on a site whose links are converted stays a link
    "https://www.dropbox.com/s/abc123/clip.mp4?dl=0",
    "https://1drv.ms/v/s!AkHd3fE",
  ])("treats %s as text", text => {
    expect(isImageUrl(text)).toBe(false);
  });
});
