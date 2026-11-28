/**
 * Marks a field as not a sign-in field, so browsers and password managers don't offer saved
 * passwords or usernames in it.
 *
 * `autocomplete="off"` covers Chrome, Firefox and Edge; the data attributes the password managers
 * that ignore it (1Password, LastPass, Bitwarden, Dashlane). Safari and iCloud Passwords ignore
 * all of them and guess from the form, which is why the sign-in forms name their fields exactly
 * (`ShowUsername`, and `current-password` or `new-password` on the password).
 */
export const notCredentials = {
  autoComplete: "off",
  "data-1p-ignore": "",
  "data-lpignore": "true",
  "data-bwignore": "",
  "data-form-type": "other",
} as const;

const credentialTokens = new Set([
  "username",
  "current-password",
  "new-password",
  "one-time-code",
  "webauthn",
]);

/**
 * The autofill attributes for a field: none for a sign-in field (a password, or one whose
 * `autoComplete` names a credential), else `notCredentials`. A field's own `autoComplete` goes on
 * top, so `autoComplete="off"` or `"email"` keep the password-manager attributes.
 */
export function autofillDefaults({
  type,
  autoComplete,
}: {
  type?: string;
  autoComplete?: string;
}) {
  const isCredential =
    type === "password" ||
    (autoComplete ?? "")
      .toLowerCase()
      .split(/\s+/)
      .some(token => credentialTokens.has(token));
  return isCredential ? {} : notCredentials;
}
