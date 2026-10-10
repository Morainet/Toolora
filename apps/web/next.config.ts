import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Next.js configuration for the web app.
 *
 * `transpilePackages` is the key piece: our internal packages
 * (`@parsy/json-core`, `@parsy/ui`) ship raw TypeScript
 * source instead of a pre-built bundle. Next.js compiles them on demand,
 * so we avoid a separate build step per package while still getting full
 * type-checking and tree-shaking.
 *
 * `@monaco-editor/react` and `monaco-editor` are externalized from the
 * server bundle because they only ever run client-side.
 *
 * The `next-intl` plugin wires up the message-loading request config so
 * `useTranslations` / `getTranslations` work in both server and client
 * components.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next dev` and `next build` may run together in the workspace. Keep their
  // generated server chunks separate so a build cannot break the live dev app.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  async redirects() {
    return [
      ["json-formatter", "format"],
      ["json-minifier", "minify"],
      ["json-validator", "validate"],
      ["json-tree", "tree"],
      ["json-diff", "diff"],
      ["json-repair", "repair"],
      ["json-converter", "converter"],
    ].map(([slug, mode]) => ({
      source: `/:locale(zh|en)/${slug}`,
      destination: `/:locale/json?mode=${mode}`,
      permanent: true,
    }));
  },
  transpilePackages: [
    "@parsy/json-core",
    "@parsy/ui",
    "@parsy/converter",
    "@parsy/toolkit",
    "@parsy/file-parser",
  ],
  // These are large, client-only libraries — keep them out of the server build.
  serverExternalPackages: ["@monaco-editor/react", "monaco-editor"],
  experimental: {
    // Web Worker via `new Worker(new URL(...))` is supported; this keeps
    // resource loading predictable during dev.
    optimizePackageImports: ["lucide-react"],
  },
};

// Point the plugin at the request config (default path is ./i18n/request.ts).
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
