#!/usr/bin/env bash
# Запуск psql с -v schema=… из BEER_TRACKER_SCHEMA (как у приложения).
# По умолчанию public — совпадает с database/init.sql.
#
# Примеры:
#   ./scripts/db/psql-with-schema.sh -h localhost -p 5433 -U postgres -d beer_tracker \
#     -f database/add-issue-links.sql
#   BEER_TRACKER_SCHEMA=beer_tracker ./scripts/db/psql-with-schema.sh -f database/add-staff-teams.sql
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "${ROOT_DIR}"

SCHEMA="${BEER_TRACKER_SCHEMA:-public}"
if [[ ! "${SCHEMA}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "BEER_TRACKER_SCHEMA must be a plain SQL identifier (got: ${SCHEMA})" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  cat <<EOF >&2
Usage: $0 [psql args...]

Sets psql variable schema=\$BEER_TRACKER_SCHEMA (default: public) and ON_ERROR_STOP.
Migration SQL files start with \\\\if :{?schema} / SET search_path TO :"schema".
EOF
  exit 1
fi

echo "psql schema=${SCHEMA} (BEER_TRACKER_SCHEMA)" >&2
exec psql -v ON_ERROR_STOP=1 -v "schema=${SCHEMA}" "$@"
