#!/usr/bin/env bash
set -euo pipefail

ARG="${1:-}"
if [[ "${ARG}" == "--" ]]; then
  ARG="${2:-}"
fi

usage() {
  cat <<'EOF'
Usage:
  pnpm version:bump -- patch
  pnpm version:bump -- minor
  pnpm version:bump -- major
  pnpm version:bump -- 1.2.3

Notes:
  - Updates version in package.json without creating a git tag/commit.
  - Full release (commit + annotated tag vX.Y.Z): pnpm release -- patch
  - UI/Docker APP_VERSION is package.json semver (same as the GitHub Release).
EOF
}

if [[ -z "${ARG}" || "${ARG}" == "-h" || "${ARG}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! "${ARG}" =~ ^(patch|minor|major|[0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  echo "Unsupported version argument: ${ARG}" >&2
  usage >&2
  exit 1
fi

pnpm version --no-git-tag-version "${ARG}" >/dev/null
NEW_VERSION="$(node -p "require('./package.json').version")"
echo "Version bumped to ${NEW_VERSION}"
