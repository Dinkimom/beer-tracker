#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
APP_VERSION="$(sh "${ROOT_DIR}/scripts/release/build-version.sh")"
echo "App version ${APP_VERSION}"
export APP_VERSION
export NEXT_PUBLIC_APP_VERSION="${APP_VERSION}"
exec "$@"
