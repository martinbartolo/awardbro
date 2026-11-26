/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // The room code field moved to the homepage
  redirects: async () => [
    { source: "/join", destination: "/#join", permanent: false },
  ],
};

export default config;
