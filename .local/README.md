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

`harbor-build.sh` передаёт `YANDEX_OAUTH_CLIENT_ID` как Docker build-arg (из
окружения или из `.env` репозитория). Значение вшивается в Next-бандл на
`pnpm build` через `next.config.ts` — одного `values.yaml` в k8s для ссылки
authorize в Harbor-образе недостаточно. Тот же id держите в values state-репо
для синхронизации рантайма и документации.
