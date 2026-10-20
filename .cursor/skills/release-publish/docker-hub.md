# Docker Hub publish (Beer Tracker)

Images are `linux/arm64` only. `linux/amd64` is not built or pushed.

## Builder

```bash
docker buildx inspect hub-push >/dev/null 2>&1 \
  || docker buildx create --name hub-push --driver docker-container --bootstrap
docker buildx use hub-push
docker buildx inspect --bootstrap hub-push >/dev/null
```

## Build + push

Worker first (lighter, warms the shared `deps` layer), then the app. Each push tags `${VERSION}` and `latest` directly — there is no per-arch tag and no `imagetools create`.

```bash
GIT_SHA=$(git rev-parse --short=7 HEAD)
APP_VERSION=$(node -p "require('./package.json').version")

build_arm64() {
  local target="$1" image="$2"
  docker buildx build \
    --builder hub-push \
    --progress=plain \
    --platform linux/arm64 \
    --target "$target" \
    --build-arg "GIT_SHA=$GIT_SHA" \
    --build-arg "APP_VERSION=$APP_VERSION" \
    --provenance=false \
    --sbom=false \
    -t "${image}:${APP_VERSION}" \
    -t "${image}:latest" \
    --push \
    .
}

build_arm64 sync-worker dinkimom/beer-tracker-sync-worker
build_arm64 runner dinkimom/beer-tracker
```

## Failure playbook

| Symptom | Action |
|---------|--------|
| `insufficient_scope` / push denied | Ask user to run `docker login` as `dinkimom`, retry push (layers often cached). |
| `cannot allocate memory` / exit 137 on Next | Stop local `beer-tracker-app-1` and `beer-tracker-sync-worker-1`, retry. Prune only if the builder cache is wedged (`docker buildx prune -af --builder hub-push`). |
| `ECONNRESET` during `pnpm install` | Retry; buildkit cache usually keeps most packages. |

## Auth note

Do not dump credential helper secrets into the chat. If push fails on auth, ask the user to re-login; then continue from cached layers.
