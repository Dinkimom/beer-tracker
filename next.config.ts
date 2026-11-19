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

/**
 * Статическая сборка демо для GitHub Pages (`pnpm demo:pages`, workflow `demo-pages.yml`):
 * export без сервера под подпутём репозитория. Серверные маршруты из дерева убирает
 * `scripts/demo-pages/prepare.mjs` — export их не собирает.
 */
const STATIC_DEMO = process.env.BEER_TRACKER_STATIC_DEMO === "1";
const STATIC_DEMO_BASE_PATH = process.env.BEER_TRACKER_STATIC_DEMO_BASE_PATH ?? "/beer-tracker";

const staticDemoConfig: NextConfig = {
  basePath: STATIC_DEMO_BASE_PATH,
  images: { unoptimized: true },
  output: "export",
  trailingSlash: true,
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BASE_PATH: STATIC_DEMO ? STATIC_DEMO_BASE_PATH : "",
    NEXT_PUBLIC_STATIC_DEMO: STATIC_DEMO ? "1" : "",
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
    NEXT_PUBLIC_APP_CHANGELOG: readEmbeddedAppChangelogJson(),
    // Yandex / Atlassian OAuth credentials are server-only runtime env
    // (`/api/auth/yandex/authorize`, `/api/auth/atlassian/*`). Do not put them in
    // `env` — that inlines values (or empties) from image build into the client bundle.
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

export default STATIC_DEMO
  ? { ...nextConfig, ...staticDemoConfig, headers: undefined }
  : nextConfig;
