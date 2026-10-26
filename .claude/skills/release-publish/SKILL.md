---
name: release-publish
description: >-
  Releases Beer Tracker: checks, version bump, tag push to the public remote,
  GitHub Release and multi-arch Docker Hub images (built by CI). Use when the
  user runs /release-publish or asks to release, bump the version or publish
  Docker images.
argument-hint: "<major|minor|patch|fix|X.Y.Z>"
disable-model-invocation: true
---

# Release Beer Tracker

Bump argument: `$ARGUMENTS`.

Pipeline: checks → commits → pins + CHANGELOG → `pnpm release` (tag push) → CI publishes the GitHub Release
(`.github/workflows/release.yml`) and Docker Hub images (`.github/workflows/docker-hub.yml`).
Do **not** build images locally: amd64 runs under QEMU on Apple Silicon, is slow and runs out of memory.

## 1. Bump type

| Argument / wording | `pnpm release` argument |
|---|---|
| `major`, мажор | `major` |
| `minor`, минор | `minor` |
| `patch`, `fix`, фикс, патч | `patch` |
| `X.Y.Z` given explicitly | `X.Y.Z` |

If the argument is empty or unclear, ask. Never invent a bump. Compute the next version from `package.json`,
state it once, then proceed without further confirmation.

## 2. Working tree

```bash
node -p "require('./package.json').version"
git status -sb
git status --short
git log --oneline "v$(node -p "require('./package.json').version")"..HEAD
```

- Branch `public-v1`, remote `public` → `Dinkimom/beer-tracker` (not `origin`).
- If there are uncommitted changes, **ask** whether to include them in the release. Never commit them
  silently. If included: read the diff, commit them as a separate `feat:` / `fix:` commit with a summary.
- Run the required checks from `AGENTS.md` before committing anything into a release and stop on failure:
  `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm lint:unused`.

Commit messages: Conventional Commit prefix, Russian summary, bullet body, then
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (see `git log` for the exact style).

## 3. Pins and CHANGELOG

Let `VERSION` be the next version. Replace the previous version with `VERSION` in:

1. `docker-compose.hub.yml` — `${BEER_TRACKER_TAG:-VERSION}` for `app` and `sync-worker`, and the header comment.
2. `README.md` and `README.en.md` — the version badge and the sentence naming the published image tag.
3. `CHANGELOG.md` — new top section `## [VERSION] — YYYY-MM-DD` with `### English` then `### Русский`.
   Short product bullets for commits since the previous tag (Settings → «Что нового» shows them).
   Call out actions operators must take (new env vars, DB migrations, OAuth app changes) explicitly.
   Last bullet in each language: the Docker Hub images line (`dinkimom/beer-tracker` and
   `dinkimom/beer-tracker-sync-worker`, tags `VERSION` and `latest`, `linux/amd64`, `linux/arm64`).

Commit only these four files:

```bash
git add docker-compose.hub.yml README.md README.en.md CHANGELOG.md
git commit -m "chore: Готовит pin образов к релизу VERSION" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## 4. Release and push

```bash
pnpm release -- <bump> --push public
```

This bumps `package.json`, commits `chore: release vX.Y.Z` (signed-off), creates tag `vX.Y.Z` and pushes
the branch, `main` and the tag to `public`. If permission to run it is denied, stop and give the user this
exact command; do not work around it with a manual `git push`.

If it fails after the bump (husky / pnpm version): check that `package.json` has the new version, then
`git commit -s -m "chore: release vX.Y.Z"`, `git tag -a vX.Y.Z -m "Beer Tracker vX.Y.Z"` and push branch,
`HEAD:main` and the tag to `public`. If hooks fail with `ERR_PNPM_BAD_PM_VERSION`, run
`corepack prepare pnpm@<packageManager version> --activate`.

## 5. Watch CI

`gh` is not installed on this machine. The repo is public, so use the GitHub API with `curl` + `node`:

```bash
SHA=$(git rev-parse HEAD)
curl -sS "https://api.github.com/repos/Dinkimom/beer-tracker/actions/runs?head_sha=$SHA&per_page=20"
```

Expect three runs for the tag commit: `CI`, `Release`, `Docker Hub`. Watch the Docker Hub run with a
Monitor that polls `/actions/runs/<id>/jobs` every 30 s and exits when the run is `completed`.

- Docker Hub builds 4 jobs in parallel (`runner` and `sync-worker` × amd64 on `ubuntu-latest`, arm64 on
  `ubuntu-24.04-arm`, about 5 minutes), then `Publish` jobs create the `VERSION` and `latest` manifests.
- Failure on «Log in to Docker Hub» / «Username and password required» means the repo secrets
  `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` are missing or expired. Ask the user to fix them in
  https://github.com/Dinkimom/beer-tracker/settings/secrets/actions and then «Re-run all jobs».
- Re-publish an existing version: Actions → Docker Hub → Run workflow, `version=X.Y.Z`
  (untick `latest` for an older version).
- For other failures, read the failed step and job annotations
  (`/check-runs/<job id>/annotations`) before suggesting a fix.

## 6. Verify

```bash
curl -sS "https://api.github.com/repos/Dinkimom/beer-tracker/releases/tags/vVERSION"
docker buildx imagetools inspect "dinkimom/beer-tracker:VERSION"
docker buildx imagetools inspect "dinkimom/beer-tracker-sync-worker:VERSION"
```

Both images must list `linux/amd64` and `linux/arm64`; `latest` must point to the same digest as `VERSION`.
Never leave `VERSION` / `latest` without `linux/amd64` — Cloud Run runs amd64 only (`exec format error`).

## 7. Report

Reply to the user with: the version and tag, the GitHub Release URL, the Docker Hub run URL and result,
the images with tags and platforms, CI status on `main`, and anything skipped or left for the user
(missing secrets, denied command). Local image build is a last-resort fallback only:
`.cursor/skills/release-publish/docker-hub.md`.
