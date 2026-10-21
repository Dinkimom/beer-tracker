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
Both GitHub Release and Hub images are built by CI from the pushed tag.

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
- Repo secrets `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` on `Dinkimom/beer-tracker` (Hub images are published by CI). Local Docker is needed only for the fallback in [docker-hub.md](docker-hub.md).
- Shell needs unrestricted permissions for git push, Docker socket, and Hub (`required_permissions: ["all"]`).
- Align pnpm with `packageManager` via `corepack prepare pnpm@<version> --activate` if hooks fail with `ERR_PNPM_BAD_PM_VERSION`.

## 3. Prep docs for the new version

Let `VERSION` be the version after bump (preview with `pnpm version:bump` logic, or bump only after docs are ready).

Update pins to `VERSION`:

1. `docker-compose.hub.yml` — default `${BEER_TRACKER_TAG:-VERSION}` for `app` and `sync-worker`, and the comment that mentions the pinned release.
2. `README.md` — sentence that names the release tag (replace the previous pin).
3. `CHANGELOG.md` — new top section `## [VERSION] — YYYY-MM-DD` (English then Russian), brief bullets for commits since the previous tag. Settings → version shows the latest product bullets from this file. Keep the Docker Hub publish line (`Docker Hub images` / `Образы Docker Hub`); that screen omits it.

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

## 5. Publish Docker Hub images (CI)

Workflow `.github/workflows/docker-hub.yml` starts on the same tag push. It builds each platform natively
(amd64 on `ubuntu-latest`, arm64 on `ubuntu-24.04-arm`, no QEMU) and publishes:

- `dinkimom/beer-tracker` (Dockerfile target `runner`)
- `dinkimom/beer-tracker-sync-worker` (target `sync-worker`)

Tags: `${VERSION}-amd64`, `${VERSION}-arm64`, then `${VERSION}` and `latest` (manifest of both).

Watch the run: `gh run list --repo Dinkimom/beer-tracker --workflow docker-hub.yml --limit 1`.

Re-publish an existing version (failed run, missing platform): Actions → Docker Hub → Run workflow
with `version=X.Y.Z` (uncheck `latest` for an older version), or
`gh workflow run docker-hub.yml --repo Dinkimom/beer-tracker -f version=X.Y.Z -f latest=true`.

Do not build locally unless CI is unavailable: amd64 under QEMU on Apple Silicon is slow and OOMs.
Local fallback recipe: [docker-hub.md](docker-hub.md).

After the run, confirm both platforms on the version tag:

```bash
docker buildx imagetools inspect "dinkimom/beer-tracker:${VERSION}"
docker buildx imagetools inspect "dinkimom/beer-tracker-sync-worker:${VERSION}"
```

## 6. Report back

Return:

- New version and tag `vX.Y.Z`
- GitHub Release URL
- Hub repos + tags (`VERSION`, `latest`, amd64+arm64)
- Docker Hub workflow run URL and result
- Any step that was skipped (e.g. missing Hub secrets)

## Do not

- Skip asking for bump type when it was not given.
- Push release tags only to `origin` when `public` exists.
- Publish `VERSION` / `latest` without `linux/amd64`. Cloud Run runs amd64 only; an arm64-only image fails there with `exec format error`.
- Commit unrelated dirty files into the release commit.
