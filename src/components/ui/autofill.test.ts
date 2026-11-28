import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { autofillDefaults, notCredentials } from "~/components/ui/autofill";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

const ignoreAttributes = Object.keys(notCredentials).filter(name =>
  name.startsWith("data-"),
);

describe("autofillDefaults", () => {
  it("marks a plain field as not a sign-in field", () => {
    expect(autofillDefaults({})).toBe(notCredentials);
    expect(autofillDefaults({ type: "number" })).toBe(notCredentials);
  });

  it("keeps the marks when a field sets a non-credential autocomplete", () => {
    expect(autofillDefaults({ autoComplete: "off" })).toBe(notCredentials);
    expect(autofillDefaults({ autoComplete: "email" })).toBe(notCredentials);
  });

  it("leaves sign-in fields to the password manager", () => {
    expect(autofillDefaults({ type: "password" })).toEqual({});
    for (const autoComplete of [
      "username",
      "current-password",
      "new-password",
      "one-time-code",
      "section-host username",
      "Current-Password",
      "username webauthn",
    ]) {
      expect(autofillDefaults({ autoComplete })).toEqual({});
    }
  });
});

describe("Input and Textarea", () => {
  it("render a plain field with every mark", () => {
    for (const element of [
      createElement(Input, { name: "name" }),
      createElement(Textarea),
    ]) {
      const html = renderToStaticMarkup(element);
      expect(html).toContain('autoComplete="off"');
      for (const name of ignoreAttributes) expect(html).toContain(name);
    }
  });

  it("let a field's own autocomplete win", () => {
    const html = renderToStaticMarkup(
      createElement(Input, { autoComplete: "email" }),
    );
    expect(html).toContain('autoComplete="email"');
    for (const name of ignoreAttributes) expect(html).toContain(name);
  });

  it("render a password field without the marks", () => {
    const html = renderToStaticMarkup(
      createElement(Input, {
        type: "password",
        autoComplete: "current-password",
      }),
    );
    expect(html).toContain('autoComplete="current-password"');
    for (const name of ignoreAttributes) expect(html).not.toContain(name);
  });
});
