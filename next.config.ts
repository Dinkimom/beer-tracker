import type { NextConfig } from "next";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseAppChangelog, selectAppChangelogReleases } from "./lib/changelog/appChangelog";

function readPackageVersion(): string {
  const pkgPath = join(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  return typeof pkg.version === "string" ? pkg.version : "";
}

/** Semver from env (CI/Docker) or package.json — same as GitHub Release tag without `v`. */
function resolveAppVersion(): string {
  const fromEnv = (process.env.APP_VERSION ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "").trim();
  if (fromEnv) {
    return fromEnv;
  }
  return readPackageVersion();
}

/** Последние продуктовые заметки. В клиентский бандл, без файла в Docker runner. */
function readEmbeddedAppChangelogJson(): string {
  const markdown = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");
  return JSON.stringify(selectAppChangelogReleases(parseAppChangelog(markdown), resolveAppVersion()));
}

function resolveYandexOauthClientId(): string {
  return (
    process.env.YANDEX_OAUTH_CLIENT_ID ??
    // legacy name from earlier builds
    process.env.NEXT_PUBLIC_YANDEX_OAUTH_CLIENT_ID ??
    ""
  ).trim();
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
    NEXT_PUBLIC_APP_CHANGELOG: readEmbeddedAppChangelogJson(),
    // Public OAuth ClientID for Yandex Tracker authorize URL in the browser.
    // Source env has no NEXT_PUBLIC_ prefix — domain name, not a Next convention.
    YANDEX_OAUTH_CLIENT_ID: resolveYandexOauthClientId(),
    // Atlassian 3LO Client ID/Secret are server-only runtime env (start/callback/refresh
    // routes). Do not put them in `env` — that inlines empty values from image build.
  },
  headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  output: "standalone",
  transpilePackages: ["@excalidraw/excalidraw"],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    authInterrupts: true,
    proxyClientMaxBodySize: '10mb',
    optimizePackageImports: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "lodash-es",
      "lottie-react",
      "recharts",
    ],
  },
};

export default nextConfig;
