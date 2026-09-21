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
  - Updates version in package.json without creating git tag/commit.
  - Use semantic version or increment keyword.
  - Image builds replace the patch with git commit count.
    Use minor/major here to change the series shown in the UI (0.3.x, 1.0.x).
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
