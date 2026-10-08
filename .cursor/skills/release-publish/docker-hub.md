# Docker Hub publish (Beer Tracker)

## Builder

```bash
docker buildx inspect hub-push >/dev/null 2>&1 \
  || docker buildx create --name hub-push --driver docker-container --bootstrap
docker buildx use hub-push
docker buildx inspect --bootstrap hub-push >/dev/null
```

## Sequential build + push

```bash
GIT_SHA=$(git rev-parse --short=7 HEAD)
APP_VERSION=$(node -p "require('./package.json').version")

build_one() {
  local target="$1" image="$2" platform="$3" suffix="$4"
  local extra=()
  if [[ "$platform" == "linux/amd64" && "$target" == "runner" ]]; then
    extra+=(--build-arg "NODE_OPTIONS=--max-old-space-size=2048")
  fi
  docker buildx build \
    --builder hub-push \
    --progress=plain \
    --platform "$platform" \
    --target "$target" \
    --build-arg "GIT_SHA=$GIT_SHA" \
    --build-arg "APP_VERSION=$APP_VERSION" \
    "${extra[@]}" \
    --provenance=false \
    --sbom=false \
    -t "${image}:${APP_VERSION}-${suffix}" \
    --push \
    .
}

build_one runner dinkimom/beer-tracker linux/arm64 arm64
build_one runner dinkimom/beer-tracker linux/amd64 amd64
build_one sync-worker dinkimom/beer-tracker-sync-worker linux/arm64 arm64
build_one sync-worker dinkimom/beer-tracker-sync-worker linux/amd64 amd64

docker buildx imagetools create \
  -t "dinkimom/beer-tracker:${APP_VERSION}" \
  -t "dinkimom/beer-tracker:latest" \
  "dinkimom/beer-tracker:${APP_VERSION}-arm64" \
  "dinkimom/beer-tracker:${APP_VERSION}-amd64"

docker buildx imagetools create \
  -t "dinkimom/beer-tracker-sync-worker:${APP_VERSION}" \
  -t "dinkimom/beer-tracker-sync-worker:latest" \
  "dinkimom/beer-tracker-sync-worker:${APP_VERSION}-arm64" \
  "dinkimom/beer-tracker-sync-worker:${APP_VERSION}-amd64"
```

Order tip: publish both sync-worker platforms first (lighter), then app. Free RAM before qemu amd64 Next build (temporarily `docker stop beer-tracker-app-1 beer-tracker-sync-worker-1`, restart after).

## Failure playbook

| Symptom | Action |
|---------|--------|
| `insufficient_scope` / push denied | Ask user to run `docker login` as `dinkimom`, retry push (layers often cached). |
| `cannot allocate memory` / exit 137 on amd64 Next | Prune builder (`docker buildx prune -af --builder hub-push`), restart builder, retry with `NODE_OPTIONS=--max-old-space-size=2048` (or 1536). Stop local beer-tracker app/worker during build. |
| `ECONNRESET` during `pnpm install` | Retry; buildkit cache usually keeps most packages. |
| `@next/swc-linux-x64-gnu` missing / wasm `turbo.createProject` | Rebuild app amd64 with `--no-cache-filter=deps,builder`. |
| Parallel `--platform linux/amd64,linux/arm64` OOM | Always build platforms sequentially, then `imagetools create`. |

## Auth note

Do not dump credential helper secrets into the chat. If push fails on auth, ask the user to re-login; then continue from cached layers.
