# Локальные оверлеи

Каталог для **локальных** файлов, которых не должно быть в публичном
репозитории (внутренние скрипты Harbor build/push/deploy, приватные хелперы и т.п.).

Всё под `.local/` в gitignore, кроме этого README.

## Harbor (интранет YClients)

Сюда кладутся приватные скрипты (не коммитятся):

```text
.local/release/harbor-build.sh
.local/release/harbor-push.sh
.local/release/bump-k8s-image-tag.sh
```

Запуск из корня репозитория:

```bash
bash .local/release/harbor-build.sh
bash .local/release/harbor-push.sh
bash .local/release/bump-k8s-image-tag.sh
# dry-run:
bash .local/release/bump-k8s-image-tag.sh --dry-run
```

Скрипты считают корень приложения как `../..` от `.local/release/` (та же
глубина, что у `scripts/release/`). Образ можно переопределить через
`HARBOR_IMAGE`.

`YANDEX_OAUTH_CLIENT_ID` и `YANDEX_OAUTH_CLIENT_SECRET` — runtime env пода (не
Docker build-arg): задайте в `values.yaml` / secrets state-репо и перезапустите app.
Вход пользователей — `/api/auth/yandex/start` → `/api/auth/yandex/callback`.
