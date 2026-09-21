import type { NextConfig } from "next";

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readPackageVersion(): string {
  const pkgPath = join(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  return typeof pkg.version === "string" ? pkg.version : "";
}

function readGitShaFromDotGit(): string {
  try {
    const gitDir = join(process.cwd(), ".git");
    const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
    if (!head.startsWith("ref: ")) {
      return head.slice(0, 7);
    }
    const refPath = join(gitDir, ...head.slice("ref: ".length).trim().split("/"));
    return readFileSync(refPath, "utf8").trim().slice(0, 7);
  } catch {
    return "";
  }
}

function readCommitCount(): string {
  try {
    return execFileSync("/usr/bin/git", ["rev-list", "--count", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function versionFromPackageAndCount(pkg: string, count: string): string {
  if (!count) {
    return pkg;
  }
  const [major, minor] = pkg.split(".");
  if (!major || minor === undefined) {
    return pkg;
  }
  return `${major}.${minor}.${count}`;
}

function resolveGitSha(): string {
  const fromEnv = (process.env.GIT_SHA ?? process.env.NEXT_PUBLIC_GIT_SHA ?? "").trim();
  if (fromEnv) {
    return fromEnv;
  }
  return readGitShaFromDotGit();
}

function resolveAppVersion(): string {
  const pkg = readPackageVersion();
  const fromEnv = (process.env.APP_VERSION ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "").trim();
  if (fromEnv && fromEnv !== pkg) {
    return fromEnv;
  }
  return versionFromPackageAndCount(pkg, readCommitCount());
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
    NEXT_PUBLIC_GIT_SHA: resolveGitSha(),
    // Public OAuth ClientID for Yandex Tracker authorize URL in the browser.
    // Source env has no NEXT_PUBLIC_ prefix — domain name, not a Next convention.
    YANDEX_OAUTH_CLIENT_ID: resolveYandexOauthClientId(),
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
