#!/usr/bin/env sh
set -eu

# Image/UI version for this build: {major}.{minor}.{build}
# major.minor — from package.json; build — git commit count.
# Does not rewrite package.json (avoids dirty trees and CI commit loops).

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "${ROOT_DIR}"

read_pkg_version() {
  if command -v node >/dev/null 2>&1; then
    node -p "require('./package.json').version"
    return
  fi
  sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -n 1
}

PKG_VERSION="$(read_pkg_version)"
MAJOR="${PKG_VERSION%%.*}"
REST="${PKG_VERSION#*.}"
MINOR="${REST%%.*}"

if command -v git >/dev/null 2>&1 && git -C "${ROOT_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  COUNT="$(git -C "${ROOT_DIR}" rev-list --count HEAD)"
  printf '%s.%s.%s\n' "${MAJOR}" "${MINOR}" "${COUNT}"
  exit 0
fi

printf '%s\n' "${PKG_VERSION}"
