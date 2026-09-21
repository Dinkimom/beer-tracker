#!/usr/bin/env bash
# Bump package.json, commit, and create annotated tag vX.Y.Z for GitHub Releases.
# Workflow .github/workflows/release.yml creates the GitHub Release when the tag is pushed.
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "${ROOT_DIR}"

BUMP=""
PUSH=0
REMOTE=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage:
  pnpm release -- patch [--push [remote]]
  pnpm release -- minor [--push [remote]]
  pnpm release -- major [--push [remote]]
  pnpm release -- 1.2.3 [--push [remote]]

Options:
  --push [remote]  After tagging, push branch + tags (default remote: public, else origin)
  --dry-run        Print actions only

Examples:
  pnpm release -- patch
  pnpm release -- patch --push public
  pnpm release -- 1.0.1 --push
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --push)
      PUSH=1
      shift
      if [[ $# -gt 0 && "$1" != --* && "$1" != patch && "$1" != minor && "$1" != major && ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        REMOTE="$1"
        shift
      fi
      ;;
    patch|minor|major)
      BUMP="$1"
      shift
      ;;
    [0-9]*.[0-9]*.[0-9]*)
      BUMP="$1"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${BUMP}" ]]; then
  usage >&2
  exit 1
fi

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "dry-run: would bump ${BUMP}, commit, tag v*, optionally push"
  exit 0
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash before release." >&2
  git status --short >&2
  exit 1
fi

bash "${ROOT_DIR}/scripts/release/bump-version.sh" -- "${BUMP}"
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"

if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "Tag ${TAG} already exists." >&2
  exit 1
fi

git add package.json
# pnpm version may touch lockfile metadata in some setups
if git status --porcelain | grep -q 'pnpm-lock.yaml'; then
  git add pnpm-lock.yaml
fi

git commit -s -m "chore: release ${TAG}"
git tag -a "${TAG}" -m "Beer Tracker ${TAG}"

echo "Created commit and tag ${TAG}"
echo "APP_VERSION / package.json = ${VERSION}"

if [[ "${PUSH}" -eq 1 ]]; then
  if [[ -z "${REMOTE}" ]]; then
    if git remote get-url public >/dev/null 2>&1; then
      REMOTE=public
    else
      REMOTE=origin
    fi
  fi
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  echo "Pushing ${BRANCH} and ${TAG} to ${REMOTE}…"
  git push "${REMOTE}" "HEAD:refs/heads/${BRANCH}"
  # public default branch may be main while local is public-v1 / master
  if [[ "${REMOTE}" == "public" && "${BRANCH}" != "main" ]]; then
    git push "${REMOTE}" "HEAD:refs/heads/main" || true
  fi
  git push "${REMOTE}" "${TAG}"
  echo "GitHub Release will be created by workflow on tag push (if enabled on that remote)."
else
  echo "Next: git push <remote> HEAD && git push <remote> ${TAG}"
  echo "Or:   pnpm release -- ${BUMP} --push   (already tagged — push manually this time)"
fi
