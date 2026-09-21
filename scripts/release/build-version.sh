#!/usr/bin/env sh
set -eu

# App/UI version for this build: exact semver from package.json.
# GitHub Release tag vX.Y.Z must match this version.

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "${ROOT_DIR}"

if command -v node >/dev/null 2>&1; then
  node -p "require('./package.json').version"
  exit 0
fi

sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -n 1
