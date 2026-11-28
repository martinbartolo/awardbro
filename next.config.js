/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Next rewrites lucide-react's imports by default but not Phosphor's: without this, dev compiles
  // every one of its icons on any page that uses one
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
  redirects: async () => [
    // The room code field moved to the homepage
    { source: "/join", destination: "/#join", permanent: false },
    // The help page was removed: the pages explain themselves. Not permanent, so browsers don't
    // cache it in case a help page comes back.
    { source: "/help", destination: "/", permanent: false },
  ],
};

export default config;
