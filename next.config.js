/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  redirects: async () => [
    // The room code field moved to the homepage
    { source: "/join", destination: "/#join", permanent: false },
    // The help page was removed: the pages explain themselves. Not permanent, so browsers don't
    // cache it in case a help page comes back.
    { source: "/help", destination: "/", permanent: false },
  ],
};

export default config;
