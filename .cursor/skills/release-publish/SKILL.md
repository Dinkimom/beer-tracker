---
name: release-publish
description: >-
  Bumps Beer Tracker semver, creates a GitHub Release on the public remote, and
  publishes multi-arch Docker Hub images. Use when the user asks to release,
  bump version, publish Docker images, push to Docker Hub, create a GitHub
  release, or run pnpm release for a new version.
---

# Release + Docker Hub publish

End-to-end release for this repo: version bump → GitHub Release → Hub images.

## 1. Ask for bump type (required)

If the user did not already choose a bump, **stop and ask** which type to use:

| User wording | Argument for `pnpm release` |
|--------------|-----------------------------|
| мажор / major | `major` |
| минор / minor | `minor` |
| фикс / патч / patch | `patch` |

Do not invent a bump. Exact version `X.Y.Z` is allowed only if the user gives it explicitly.

After the choice, compute the next version from `package.json` and state it once, then proceed without further confirmation unless the working tree is dirty with unrelated changes.

## 2. Preconditions

- Branch: work on the public-facing branch (usually `public-v1` tracking `public/main`).
- Remote for release: `public` → `Dinkimom/beer-tracker` (not `origin` unless user says so).
- Working tree should be clean, or only contain intentional release-prep edits.
- Docker Desktop running; Hub login under `dinkimom` (`docker login` if push fails with `insufficient_scope`).
- Shell needs unrestricted permissions for git push, Docker socket, and Hub (`required_permissions: ["all"]`).
- Align pnpm with `packageManager` via `corepack prepare pnpm@<version> --activate` if hooks fail with `ERR_PNPM_BAD_PM_VERSION`.

## 3. Prep docs for the new version

Let `VERSION` be the version after bump (preview with `pnpm version:bump` logic, or bump only after docs are ready).

Update pins to `VERSION`:

1. `docker-compose.hub.yml` — default `${BEER_TRACKER_TAG:-VERSION}` for `app` and `sync-worker`, and the comment that mentions the pinned release.
2. `README.md` — sentence that names the release tag (replace the previous pin).
3. `CHANGELOG.md` — new top section `## [VERSION] — YYYY-MM-DD` (English then Russian), brief bullets for commits since the previous tag.

Commit prep separately if needed:

```bash
git add docker-compose.hub.yml README.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
chore: Готовит pin образов к релизу VERSION

EOF
)"
```

(Replace `VERSION` with the real semver in the message.)

## 4. Bump, tag, push (GitHub Release)

Preferred:

```bash
pnpm release -- <major|minor|patch|X.Y.Z> --push public
```

This bumps `package.json`, commits `chore: release vX.Y.Z` (signed-off), creates annotated tag `vX.Y.Z`, pushes branch + `main` on `public` when local branch ≠ `main`, and pushes the tag.

Workflow `.github/workflows/release.yml` creates the GitHub Release when the tag lands (tag must match `package.json`).

If `pnpm release` fails after the bump (husky / pnpm version):

1. Confirm `package.json` already has the new version.
2. Finish manually: `git commit -s -m "chore: release vX.Y.Z"`, `git tag -a vX.Y.Z -m "Beer Tracker vX.Y.Z"`, then push branch + tag to `public` (and `HEAD:main` when appropriate).

Verify:

```bash
curl -sS -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/Dinkimom/beer-tracker/releases/tags/v${VERSION}"
```

## 5. Publish Docker Hub images

Images:

- `dinkimom/beer-tracker` (Dockerfile target `runner`)
- `dinkimom/beer-tracker-sync-worker` (target `sync-worker`)

Tags: `${VERSION}`, `latest`, plus platform tags `${VERSION}-arm64` / `${VERSION}-amd64`.

Platforms: `linux/arm64` and `linux/amd64`. Build **one platform at a time** (parallel multi-arch OOMs on this machine).

Use builder `hub-push` (docker-container driver). Details and retry recipes: [docker-hub.md](docker-hub.md).

After push, confirm both platforms on the version tag:

```bash
docker buildx imagetools inspect "dinkimom/beer-tracker:${VERSION}"
docker buildx imagetools inspect "dinkimom/beer-tracker-sync-worker:${VERSION}"
```

## 6. Report back

Return:

- New version and tag `vX.Y.Z`
- GitHub Release URL
- Hub repos + tags (`VERSION`, `latest`, amd64+arm64)
- Any step that was skipped or needs a manual `docker login`

## Do not

- Skip asking for bump type when it was not given.
- Push release tags only to `origin` when `public` exists.
- Publish a single-arch image as `VERSION` / `latest` without saying so.
- Commit unrelated dirty files into the release commit.
