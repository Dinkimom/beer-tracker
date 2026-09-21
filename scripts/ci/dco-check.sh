#!/usr/bin/env sh
# Проверка DCO (Developer Certificate of Origin): в каждом коммите диапазона
# base..head должна быть строка Signed-off-by с email автора коммита.
# Merge-коммиты (несколько родителей) пропускаются.
#
# Локально / CI: scripts/ci/dco-check.sh <base_ref_or_sha> <head_ref_or_sha>
# Пример: scripts/ci/dco-check.sh origin/master HEAD

set -eu

BASE=${1:-}
HEAD=${2:-}

if [ -z "$BASE" ] || [ -z "$HEAD" ]; then
  echo "dco-check: задайте base и head SHA." >&2
  echo "  Пример: $0 <base_ref_or_sha> <head_ref_or_sha>" >&2
  exit 1
fi

failed=0
for sha in $(git log --reverse --format=%H "${BASE}..${HEAD}"); do
  n_parents=$(git show -s --format=%P "$sha" | wc -w | tr -d ' ')
  if [ "$n_parents" -gt 1 ]; then
    echo "dco-check: пропуск merge-коммита $sha"
    continue
  fi

  body=$(git show -s --format=%B "$sha")
  author_email=$(git show -s --format=%ae "$sha")

  signed_lines=$(printf '%s\n' "$body" | grep '^Signed-off-by:' || true)
  if [ -z "$signed_lines" ]; then
    echo "dco-check: в коммите $sha нет строки Signed-off-by:" >&2
    git show -s --oneline "$sha" >&2
    failed=1
    continue
  fi

  if ! printf '%s\n' "$signed_lines" | grep -Fq "<${author_email}>"; then
    echo "dco-check: в коммите $sha Signed-off-by должен содержать email автора <${author_email}>" >&2
    git show -s --oneline "$sha" >&2
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo >&2
  echo "dco-check: см. CONTRIBUTING.md — используйте «git commit -s» или добавьте Signed-off-by вручную." >&2
  exit 1
fi

echo "dco-check: OK (${BASE}..${HEAD})"
