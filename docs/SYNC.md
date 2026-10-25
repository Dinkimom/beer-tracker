# Синхронизация трекер → БД

Экспортёр выгружает задачи из Яндекс Трекера или Jira в PostgreSQL: снимки задач, changelog, якоря плана. Планер и бэклог читают эти таблицы. Провайдер и токен берутся из настроек организации ([ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md)).

Связанные документы: [DATABASE.md](./DATABASE.md) (таблицы), [INSTALL.md](./INSTALL.md) (запуск).

## Компоненты

| Компонент | Где | Роль |
|-----------|-----|------|
| Очередь BullMQ `beer-tracker-sync` | `lib/sync/queue.ts`, `lib/sync/constants.ts` | Next.js ставит задачи в Redis (`REDIS_URL`) |
| Воркер | `apps/sync-worker/main.ts` → `lib/sync/worker.ts` | отдельный процесс без Next.js, `concurrency: 2` |
| Обработка задачи | `lib/sync/processSyncJob.ts` → `lib/sync/runOrgSync.ts` | один прогон для организации |
| Журнал прогонов | `lib/sync/syncRunsRepository.ts`, таблица `sync_runs` | блокировка, статус, `stats` |
| Плановый тик | `POST /api/internal/sync/tick` → `lib/sync/handleSyncTick.ts` | ставит `incremental` по организациям, у которых подошёл срок |
| Inline full rescan | `POST /api/internal/sync/full-rescan` → `lib/sync/handleSyncFullRescan.ts` | полный прогон прямо в HTTP-запросе, без Redis |
| Админка | `/admin/sync` (`app/admin/sync/page.tsx`), `app/api/admin/organizations/[organizationId]/sync/*` | статус, ручной запуск, настройки |

Запуск воркера:

```bash
REDIS_URL=redis://localhost:6379 pnpm sync-worker   # на хосте (tsx)
pnpm sync-worker:build                               # бандл dist/sync-worker/index.js (Docker target sync-worker)
docker compose --profile exporter up -d              # сервис sync-worker
```

В `pnpm docker:dev` воркер работает через `tsx watch` и подхватывает правки в `lib/sync`. Без воркера задачи висят в Redis в `waiting`, в БД ничего не появляется.

`app/api/queues/*` — это **очереди трекера** (метаданные Tracker/Jira), к BullMQ отношения не имеют.

## Режимы

| Режим (`job_type`) | Кто ставит | Что делает |
|--------------------|------------|------------|
| `initial_full` | `POST /api/admin/organizations/[organizationId]/tracker` после сохранения подключения трекера (`enqueueInitialSyncJob` в `lib/organizations/organizationTrackerConnectionHelpers.ts`) | полная выгрузка по очередям активных команд + `settings.sync.extraQueueKeys`; в конце `initial_sync_completed_at` и `sync_next_run_at` |
| `incremental` | тик (`handleSyncTick`) или кнопка в админке (`.../sync/incremental`) | задачи, обновлённые в окне `[since, until]`; пишет `watermark_until` в `sync_runs.stats` |
| `full_rescan` | кнопка в админке (`.../sync/full-rescan`, тело `{ "confirm": true }`) через очередь или `POST /api/internal/sync/full-rescan` inline | как `initial_full`; в конце пишет `settings.sync.lastFullRescanAt` |

Каждый прогон: `issue_snapshots` (снимки), `issue_changelog_events` (changelog и комментарии по выгруженным ключам), `captureActiveSprintPlanAnchorsQuietly` (`sprint_plan_captures`).

**Окно incremental** (`lib/sync/watermark.ts`): `until = now`; `since = последний watermark_until − overlap`. Без watermark: `since = until − (interval + overlap)`. Watermark берётся из последнего `incremental` со статусом `success`/`partial`, завершённого после `lastFullRescanAt`.

**Лимиты:** incremental — не больше `maxIssuesPerRun` задач; full — не больше `SYNC_FULL_SYNC_MAX_ISSUES_PER_RUN`. Если упёрлись в лимит, статус прогона `partial`. Если у организации нет очередей, full-прогон завершается `failed`.

**Пропуски** (задача BullMQ завершается без ошибки, в лог пишется `skipped reason=…`): `invalid_sync_settings`, `sync_disabled` и `incremental_before_initial` (только incremental), `missing_issue_tracker`, `missing_tracker_org_id` (Яндекс без Cloud Org ID), `missing_tracker_token`, `concurrent_sync`.

## Расписание

Встроенного планировщика нет. Тик дёргает внешний cron:

```bash
curl -X POST -H "X-Sync-Cron-Secret: $SYNC_CRON_SECRET" http://app:3000/api/internal/sync/tick
```

- В compose это сервис `sync-cron` (профили `cron` и `exporter`): `curl` раз в `SYNC_CRON_LOOP_SECONDS` секунд (по умолчанию 300). При пустом `SYNC_CRON_SECRET` сервис спит.
- Тик выбирает до `SYNC_MAX_ORGS_PER_TICK` организаций с `initial_sync_completed_at IS NOT NULL` и `sync_next_run_at` в прошлом (или NULL). Для каждой ставит `incremental` и сразу сдвигает `sync_next_run_at = now + intervalMinutes`, не дожидаясь результата.
- Ответ: `{ ok, enqueued, organizationIds, skippedInvalidSettings?, reason? }`. Без `REDIS_URL` — `200` с `reason: "redis_not_configured"`; неверный секрет — `401`.
- Секрет принимается в `X-Sync-Cron-Secret` или в `Authorization: Bearer …`.

`SYNC_CRON_TICK_MINUTES` реальный интервал не задаёт: это число для валидации, overlap должен быть строго больше него. Держите его согласованным с частотой cron (`SYNC_CRON_LOOP_SECONDS` / 60).

## Настройки

**Организация:** `organizations.settings.sync` (`lib/orgSyncSettings.ts`), правится через `PATCH /api/admin/organizations/[organizationId]/sync/settings`. Поля: `enabled` (по умолчанию true), `intervalMinutes`, `overlapMinutes`, `maxIssuesPerRun`, `extraQueueKeys`; служебное — `lastFullRescanAt`. Значения зажимаются в границы платформы.

**Платформа (env, `lib/env.ts` → `getSyncPlatformEnv()`):**

| Переменная | По умолчанию | Смысл |
|------------|--------------|-------|
| `REDIS_URL` | — | Redis для BullMQ (и realtime свимлейна). Пусто — очередь недоступна |
| `SYNC_CRON_SECRET` | — | секрет `/api/internal/sync/*` и `/api/internal/db-contract/status` |
| `SYNC_CRON_LOOP_SECONDS` | 300 | период сервиса `sync-cron` (только compose) |
| `SYNC_CRON_TICK_MINUTES` | 5 | ожидаемый шаг cron для валидации overlap |
| `SYNC_MIN_INTERVAL_MINUTES` / `SYNC_MAX_INTERVAL_MINUTES` / `SYNC_DEFAULT_INTERVAL_MINUTES` | 5 / 1440 / 15 | интервал incremental |
| `SYNC_MIN_OVERLAP_MINUTES` / `SYNC_MAX_OVERLAP_MINUTES` / `SYNC_DEFAULT_OVERLAP_MINUTES` | tick+1 / 240 / max(tick+1, min, 10) | нахлёст окна |
| `SYNC_MAX_ORGS_PER_TICK` | 50 | организаций за один тик |
| `SYNC_MIN_MAX_ISSUES_PER_RUN` / `SYNC_MAX_MAX_ISSUES_PER_RUN` / `SYNC_DEFAULT_MAX_ISSUES_PER_RUN` | 10 / 5000 / 500 | лимит задач incremental |
| `SYNC_FULL_SYNC_MAX_ISSUES_PER_RUN` | 50000 | лимит задач full |
| `SYNC_FULL_RESCAN_COOLDOWN_MINUTES` | 0 | пауза между успешными full_rescan (0 — без паузы) |
| `EXPORTER_ENABLED` / `NEXT_PUBLIC_EXPORTER_ENABLED` | true | скрывают раздел `/admin/sync`; воркер и тик не выключают |

Воркеру нужны те же `POSTGRES_*`, `BEER_TRACKER_SCHEMA` и `ORG_SECRETS_ENCRYPTION_KEY`, что и приложению: он расшифровывает токен организации из `organization_secrets`.

## Блокировки и зависшие `running`

- **Один прогон на организацию.** `tryBeginSyncRun` вставляет строку `sync_runs` со статусом `running`; уникальный индекс `uq_sync_runs_one_running_per_org` не даёт второй. Конфликт — `skipped: concurrent_sync`, повтора нет.
- **Дедупликация в Redis.** `initial_full` и `full_rescan` идут с фиксированным `jobId` (`initial-full-<org>`, `full-rescan-<org>`): живая задача переиспользуется, завершённая удаляется и ставится заново. Ручной `incremental` в админке отклоняется (`409`), если есть `running` в PG или тяжёлая задача в очереди. Ручной `full_rescan` отклоняется при `running`, тяжёлой задаче в очереди или незакончившемся cooldown (`429`).
- **Повторы BullMQ:** `attempts: 5`, экспоненциальный backoff от 2 с; хранятся последние 500 выполненных и 200 упавших задач.

Как закрываются зависшие `running`:

1. **Старт воркера** (`failInterruptedRunningSyncRuns` в `apps/sync-worker/main.ts`): все `running` во всей БД переводятся в `failed` с текстом «Прогон прерван перезапуском воркера синхронизации.». В лог пишется `[sync-worker] closed N sync run(s) left running by a restart`.
2. **Повтор той же задачи BullMQ** после убитого процесса (`failRunningSyncRunForBullJob`): `running` с тем же `stats.bull_job_id` закрывается, прогон стартует заново.
3. **Inline full rescan** (коммит 5e95d9d4): если `running` старше 40 минут (больше `maxDuration = 1800` с у маршрута), он закрывается как `failed` («Прервано: превышено время inline-прогона»), и новый прогон стартует. Моложе 40 минут — `409` с `syncRunId`.

Пункт 1 закрывает и чужие `running`: inline-прогоны в app и прогоны второго экземпляра воркера, если их несколько.

## Диагностика

**Админка:** `/admin/sync` → `GET /api/admin/organizations/[organizationId]/sync/status` показывает живые задачи Redis с прогрессом, последний `sync_run` и текущий `running`.

**Логи воркера:** `[sync-worker] done status=… org=… bullJobId=… syncRunId=…`, `[sync-worker] skipped reason=…`, `[sync-worker] job failed …`.

**SQL** (схема — `BEER_TRACKER_SCHEMA`):

```sql
-- последние прогоны организации
SELECT id, job_type, status, started_at, finished_at, error_summary, stats
FROM sync_runs WHERE organization_id = '<uuid>' ORDER BY started_at DESC LIMIT 10;

-- кто сейчас running
SELECT organization_id, id, job_type, started_at, stats->>'bull_job_id' AS bull_job_id
FROM sync_runs WHERE status = 'running';

-- готовность к тику
SELECT id, initial_sync_completed_at, sync_next_run_at, settings->'sync' AS sync
FROM organizations;
```

Зависший `running` без живого воркера закрывается рестартом воркера (п. 1 выше). Вручную — тем же апдейтом, что делает код:

```sql
UPDATE sync_runs SET status = 'failed', finished_at = CURRENT_TIMESTAMP,
  error_summary = 'manual reset' WHERE id = '<sync_run_id>' AND status = 'running';
```

**Redis:** очередь создаётся без своего `prefix`, ключи — `bull:beer-tracker-sync:*` (например `redis-cli LLEN bull:beer-tracker-sync:wait`).

**`enqueued: 0` у тика** — частые причины (см. также шапку `docker-compose.yml`): пустой или неверный секрет (`401`); нет `REDIS_URL` у app; ни у одной организации не подошёл `sync_next_run_at`; не завершён `initial_full`; `settings.sync.enabled = false`; невалидные интервалы или overlap (`skippedInvalidSettings`).

**Задачи висят в `waiting`** — воркер не запущен или смотрит в другой Redis. В контейнерах compose всегда задаёт `REDIS_URL=redis://redis:6379`.

## Другие процессы в `apps/`

- **`apps/mcp-sprint-context`** — stdio MCP-сервер для локальной отладки: один инструмент `get_sprint_context`, который ходит в `GET /api/sprints/{id}/sprint-context`. Запуск: `pnpm mcp:sprint-context`, env: `BEER_TRACKER_URL`, `BEER_TRACKER_MCP_ACCESS_TOKEN` (OAuth access token из `/api/oauth/token`). Для работы есть remote MCP на `/api/mcp`.
- **`apps/agent-bridge`** — локальный мост к `claude -p` для сессий агента (`pnpm agent-bridge`, настройки в `.env.agent-bridge.local`). Описан в [SPRINT_CONTEXT.md](./SPRINT_CONTEXT.md).

К синхронизации оба процесса отношения не имеют.
