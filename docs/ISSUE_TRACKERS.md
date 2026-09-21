# Issue trackers (Yandex Tracker и Jira)

Beer Tracker — **надстройка** над внешней системой учёта задач. На один self-hosted инстанс выбирается **один** провайдер; планер, снимки и staff/teams от провайдера не зависят.

Выбор: `ISSUE_TRACKER_PROVIDER` + `TRACKER_API_URL` (см. `env.example`).

| Значение | Система | Auth (типично) |
|----------|---------|----------------|
| `tracker` (по умолчанию; алиас `yandex-tracker`) | Яндекс Трекер | OAuth-токен; Cloud Organization ID — в админке организации |
| `jira-cloud` | Jira Cloud | email + API token Atlassian |
| `jira-onprem` | Jira Data Center / Server | personal access token |
| `jira` | алиас | cloud или on-prem по виду `TRACKER_API_URL` |

Код провайдера: `lib/issueTrackerProvider/` (registry + адаптеры). HTTP-роуты должны ходить в provider-client, а не в Yandex/Jira API напрямую.

## Что общее

- Задачи, статусы, спринты/доски живут во внешнем трекере.
- Планер хранит позиции, связи, цели, availability в PostgreSQL.
- Пользовательский токен/учётка — в браузере; в API уходит заголовками (`X-Tracker-Token`, для Jira Cloud ещё email).
- Опциональный серверный fallback-токен в env — см. README.
- Фоновый sync (`pnpm sync-worker`) пишет `issue_snapshots` независимо от того, Yandex это или Jira.

## Где настраивать

1. **Инстанс** — `.env`: `ISSUE_TRACKER_PROVIDER`, `TRACKER_API_URL`.
2. **Организация** — админка «Трекер» / integration: org-specific поля (для Yandex — Cloud Org ID; для Jira — site/credentials полей админки).
3. **Пользователь** — `/auth-setup` или настройки: свой токен для мутаций от своего имени.

Подробнее по полям env и URL: комментарии в [`env.example`](../env.example).  
История выноса адаптеров и контрактные тесты Yandex: [ISSUE_TRACKER_PROVIDER_MIGRATION.md](./ISSUE_TRACKER_PROVIDER_MIGRATION.md), [ISSUE_TRACKER_YANDEX_CONTRACT.md](./ISSUE_TRACKER_YANDEX_CONTRACT.md).
