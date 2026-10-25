# База данных

PostgreSQL 16 (`postgres:16-alpine` в `docker-compose.yml`). Как схема попадает в БД, как обновлять живую БД, какие таблицы за что отвечают.

Связанные документы: [COMMERCIAL_DB_CONTRACT.md](./COMMERCIAL_DB_CONTRACT.md) (каталог staff/teams, права, `DB_CONTRACT_MODE`), [SYNC.md](./SYNC.md) (таблицы синхронизации), [INSTALL.md](./INSTALL.md).

## Как применяется схема

В репозитории **нет раннера миграций и нет таблицы учёта** применённых файлов. Схема попадает в БД тремя путями.

| Путь | Когда срабатывает | Что делает |
|------|-------------------|------------|
| `database/init.sql` через `docker-entrypoint-initdb.d` | только при **первом** старте пустого тома `postgres_data` (`docker-compose.yml`, сервис `db`) | создаёт всю схему в `public` |
| Ручной `psql -f database/<файл>.sql` | когда оператор запускает сам | точечная миграция живой БД |
| Runtime-DDL в `lib/` (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) | при первом обращении репозитория к таблице в процессе | догоняет часть таблиц и колонок, см. ниже |

При старте Node-процесса `instrumentation.ts` миграции **не** запускает. Он вызывает только `runDbContractPreflightOnStartup()` (`lib/dbContractPreflight.ts`): это проверка внешних таблиц `overseer.*` / `public.registry_employees`, и только при `DB_CONTRACT_MODE=compatibility`. Сервис `app` в `docker-compose.yml` и `docker-entrypoint-dev.sh` тоже ничего в БД не применяют.

### Runtime-DDL (самолечение схемы)

Эти модули создают или дополняют свои таблицы при первом обращении (флаг `schemaEnsured` на процесс):

| Модуль | Таблицы / колонки |
|--------|-------------------|
| `lib/sprints/ensurePlannerCommentImages.ts` | `planner_files`; `comments.kind` (CHECK с `widget`), `image_file_id`, `parent`, `pending_approval*`, `plan_patch_proposal_id`, `client_brand`, `replaces_comment_id`, `replace_action`, `updated_by`, `version`, `deleted_*`; удаляет BYTEA-колонку `planner_files.data` вместе с данными |
| `lib/sprints/sprintPlanPatchPositionPreviewRepository.ts`, `sprintPlanPatchGoalPreviewRepository.ts`, `planPatchPreviewOwnerSchema.ts` | `plan_patch_position_previews`, `plan_patch_goal_previews`, `owner_id` в PK |
| `lib/agentSessions/agentSessionsRepository.ts` | `agent_sessions`, `agent_session_messages` (включая `options`, `skill_id`, `skill_params`) |
| `lib/sprints/swimlaneCardLayersRepository.ts` | `swimlane_card_layers` |
| `lib/sprintMetrics/sprintMetricsRepository.ts` | `sprint_metrics` |
| `lib/mcp/oauth/mcpOAuthRepository.ts` | `mcp_oauth_clients`, `mcp_oauth_codes`, `mcp_oauth_tokens` |
| `lib/quarterlyPlans/ensureQuarterlyPlanV2Tables.ts` | `quarterly_plan_v2_*` |
| `lib/notifications/ensureUserNotificationsTable.ts` | `user_notifications` + CHECK `kind` |
| `lib/analytics/analyticsEventsRepository.ts` | `analytics_events` |
| `lib/auth/adminsRepository.ts` | `admins` |
| `lib/planner/migrateOrganizationPlannerGrid.ts` | CHECK `*_part_check` (0..3) при смене сетки таймслотов в админке |

Для runtime-DDL у роли приложения должны быть права владельца таблиц: `ALTER TABLE` в PostgreSQL требует владельца, даже с `IF NOT EXISTS`. Ошибка ensure не глотается: запрос, который его вызвал, падает.

## Свежая установка

1. Пустая БД → `database/init.sql`. В Docker это делает том при первом старте. Свой Postgres: `psql -v ON_ERROR_STOP=1 -f database/init.sql`.
2. Остальные `database/*.sql` на свежей БД **не нужны**: `init.sql` кумулятивный, кроме исключений ниже.

Что `init.sql` не создаёт:

- `quarterly_plan_v2_epics`, `quarterly_plan_v2_story_phases`, `quarterly_plan_v2_excluded_stories`, `quarterly_plan_v2_story_events`. Их создаёт runtime (`ensureQuarterlyPlanV2Tables`) или `database/quarterly_plan_v2_tables.sql`.
- `mcp_oauth_clients`, `mcp_oauth_codes`, `mcp_oauth_tokens`. Их создаёт runtime (`mcpOAuthRepository`) или `database/add-mcp-oauth.sql`.
- Колонки `agent_session_messages.options`, `skill_id`, `skill_params`: только runtime, SQL-файла нет.
- CHECK `comments_position_y_layer_shift_check` (`database/add-comment-card-row-height.sql`).
- Индекс `uq_organizations_slug_lower` (`database/init.master-tenant-addon.sql`).

`init.sql` жёстко пишет в `public` (`SET search_path TO public`, `public.<table>`) и `BEER_TRACKER_SCHEMA` не читает. Для другой схемы готового init-скрипта в репозитории нет.

## Обновление живой БД

Том Docker, созданный старым `init.sql`, сам не обновится. Файлы из `database/` применяются вручную, по одному, через обёртку, которая передаёт `schema` из `BEER_TRACKER_SCHEMA`:

```bash
./scripts/db/psql-with-schema.sh -h localhost -p 5433 -U postgres -d beer_tracker \
  -f database/add-swimlane-card-layers.sql
# то же через package.json:
pnpm db:psql -h localhost -p 5433 -U postgres -d beer_tracker -f database/add-swimlane-card-layers.sql
# legacy-схема:
BEER_TRACKER_SCHEMA=beer_tracker ./scripts/db/psql-with-schema.sh -f database/add-staff-teams.sql
```

Внутри compose-сети (без psql на хосте):

```bash
docker compose exec -T db psql -U postgres -d beer_tracker -v ON_ERROR_STOP=1 -v schema=public \
  < database/add-swimlane-card-layers.sql
```

Файлы с шапкой `\if :{?schema}` берут схему из переменной psql (по умолчанию `public`). Без шапки: `init.sql`, `add-issue-links.sql`, `cleanup-task-task-planner-links.sql`, `drop-issue-links.sql`.

Какие файлы нужны: всё, что добавлено после версии, с которой создавался том. Дату и релиз смотрите в таблице. Повторный запуск идемпотентных файлов безопасен, остальные см. в колонке «Повтор».

### Порядок миграций

Дата — первый коммит файла (`git log --diff-filter=A`), релиз — первый тег, в который он вошёл. Файлы от 2026-09-21 пришли одним коммитом `chore: initial public release v1.0.0`: история до него не сохранилась, поэтому порядок внутри этой группы восстановлен по зависимостям.

«В init.sql»: да — свежей БД файл не нужен; частично — см. примечание; нет — объекты есть только в этом файле или в runtime.
«Повтор»: да — можно запускать повторно; данные — повтор теряет или портит данные; нет — повтор падает.

**Legacy / до v1.0.0 (2026-09-21, v1.0.0)**

| Файл | Назначение | В init.sql | Повтор |
|------|------------|-----------|--------|
| `init.master-tenant-addon.sql` | слой организаций (`organizations`, `organization_secrets`, `admins`) на чужом Postgres | частично (нет `uq_organizations_slug_lower`) | нет: `CREATE TRIGGER` без `DROP` |
| `legacy-add-organization-id.sql` | `organization_id` в таблицах планера single-tenant инсталляций | да | да, но UUID организации зашит в файл |
| `add-staff-teams.sql` | `staff`, `teams`, `team_members`, `system_roles`, `org_roles` + разовое копирование из `overseer.*` / `registry_employees` | да | да |
| `add-staff-avatar-url.sql` | `staff.avatar_url` + бэкфилл из `registry_employees` | да | да |
| `add-admins.sql` | `admins`; снимает FK `analytics_events.user_id`; удаляет `organization_invitations`, `users` | да | да (удаление legacy-таблиц необратимо) |
| `migrate-vacations-to-board-availability-events.sql` | `vacations` → `board_availability_events`, `DROP TABLE vacations` | да | да, но см. «Известные проблемы» |
| `remove_quarterly_v1_data.sql` | удаляет таблицы квартального плана v1 | да | да |
| `quarterly_plan_v2_tables.sql` | таблицы квартального плана v2 | **нет** (runtime) | да |
| `add-issue-snapshots.sql` | `issue_snapshots`, `issue_changelog_events` | да | да |
| `add-analytics-events.sql` | `analytics_events` | да | да |
| `add-user-notifications.sql` | `user_notifications` | да | да |
| `add-user-notifications-comment-mention.sql` | CHECK `kind` += `comment_mention` | да | да |
| `add-sprint-feature-lanes.sql` | `sprint_feature_lanes` | да | да |
| `drop-comment-task-id.sql` | удаляет `comments.task_id` | да | да |
| `add-comment-author.sql` | `comments.created_by` | да | **данные**: `DROP COLUMN created_by` и пересоздание |
| `add-comment-color.sql` | `comments.color` + CHECK | да | да |
| `add-comment-card-row-height.sql` | `comments.height` в строках, нормализация `position_y`, CHECK | частично (нет CHECK на `position_y`) | да |
| `add-comment-reactions.sql` | `comment_reactions` | да | да |
| `add-planner-comment-images.sql` | `planner_files`, `comments.kind` / `image_file_id` | да | **данные**: CHECK `kind` без `widget` |
| `migrate-planner-files-to-s3.sql` | переход `planner_files` с BYTEA на `storage_key` (S3) | да | **данные**: каждый запуск удаляет фото и схемы |
| `widen-planner-day-checks.sql` | индексы дня 0..399 | да | да |
| `add-comment-client-brand.sql` | `comments.client_brand` | да | да |

**После v1.0.0**

| Дата | Релиз | Файл | Назначение | В init.sql | Повтор |
|------|-------|------|------------|-----------|--------|
| 2026-09-23 | v1.2.0 | `widen-planner-part-checks.sql` | часть дня 0..3 | да | да |
| 2026-09-28 | v1.4.0 | `add-sprint-goals-organization-id.sql` | `sprint_goals.organization_id` + бэкфилл | да | только при схеме `beer_tracker`, см. ниже |
| 2026-10-04 | v1.4.0 | `add-retro-boards.sql` | `retro_boards` | да | да |
| 2026-10-04 | v1.4.0 | `add-retro-column-templates.sql` | `retro_column_templates` | да | да |
| 2026-10-06 | v1.4.0 | `add-sprint-plan-anchors.sql` | `sprint_plan_captures` | да | да |
| 2026-10-08 | v1.5.0 | `add-issue-links.sql` | устарел, внутри только комментарий | — | — |
| 2026-10-08 | v1.6.0 | `drop-issue-links.sql` | `DROP TABLE beer_tracker.issue_links` | да | да |
| 2026-10-08 | v1.6.0 | `cleanup-task-task-planner-links.sql` | удаляет связи задача↔задача из `beer_tracker.task_links` | — | да (разовая чистка) |
| 2026-10-11 | v1.10.0 | `add-organization-issue-tracker-settings.sql` | перенос `ISSUE_TRACKER_PROVIDER` / `TRACKER_API_URL` из env в `organizations.settings.issueTracker` (`-v provider=… -v api_url=…`) | не нужен | да |
| 2026-10-14 | v1.13.0 | `add-comment-widget-kind.sql` | CHECK `comments.kind` += `widget` | да | да |
| 2026-10-16 | v1.16.0 | `add-mcp-oauth.sql` | `mcp_oauth_*` (OAuth для `/api/mcp`) | **нет** (runtime) | да |
| 2026-10-16 | v1.16.3 | `add-comment-audit-version.sql` | `comments.version`, `updated_by`, мягкое удаление | да | да |
| 2026-10-19 | v1.17.2 | `add-plan-patch-previews.sql` | `plan_patch_position_previews`, `plan_patch_goal_previews` | да | да |
| 2026-10-20 | v1.18.0 | `add-sprint-metrics.sql` | `sprint_metrics` | да | да |
| 2026-10-20 | v1.18.0 | `add-agent-sessions.sql` | `agent_sessions`, `agent_session_messages`; `owner_id` в PK превью | да (кроме колонок `options` / `skill_*`) | да |
| 2026-10-23 | v1.23.1 | `add-agent-session-activity.sql` | `agent_sessions.agent_step*` | да | да |
| 2026-10-23 | v1.23.1 | `add-comment-replacements.sql` | `comments.replaces_comment_id`, `replace_action` | да | да |
| 2026-10-23 | v1.24.0 | `add-swimlane-card-layers.sql` | `swimlane_card_layers` | да | да |

`add-plan-patch-previews.sql` запускать до `add-agent-sessions.sql`: второй перестраивает PK таблиц превью.

## Схема и тенанты

- `BEER_TRACKER_SCHEMA` (по умолчанию `public`, `lib/env.ts` → `getBeerTrackerSchema()`). Legacy-инстансы: `beer_tracker`.
- `lib/db.ts` → `qualifyBeerTrackerTables()` подставляет схему перед таблицами из списка `BEER_TRACKER_TABLES` после `FROM` / `INTO` / `UPDATE` / `JOIN` / `REFERENCES` / `ALTER TABLE` / `USING`. Это делают `query()` и `runBeerTrackerTransaction()`.
- Таблицы вне `BEER_TRACKER_TABLES` идут без схемы и резолвятся через `search_path` соединения: `features`, `feature_*`, `document_types`, `document_versions`, `story_*`, `sprint_metrics`, `quarterly_plan_v2_*`. Пул (`lib/db.ts`) `search_path` не задаёт.
- Мультиарендность: почти все таблицы планера несут `organization_id → organizations(id) ON DELETE CASCADE`. Без `organization_id`: `features`, `feature_*`, `document_*`, `story_*`, `quarterly_plans`, `quarterly_plan_v2_*` и `board_availability_events` (ключ — `board_id`), а также `admins` и `system_roles` (глобальные).
- Подключение: `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` или `PG*`. Пул: `DB_POOL_MAX` (потолок 20), `DB_POOL_MIN`, `DB_POOL_TIMEOUT`; `statement_timeout` 10 с.

## Таблицы по доменам

**Тенант, доступ, каталог**
- `organizations` — тенант; `settings` (JSONB: `issueTracker`, `sync`), `sync_next_run_at`, `initial_sync_completed_at`.
- `organization_secrets` — зашифрованный токен трекера организации (`ORG_SECRETS_ENCRYPTION_KEY`).
- `admins` — админы продукта (`staff_uid = staff.id`).
- `staff` — сотрудники организации, `tracker_user_id`.
- `teams` — команда ↔ очередь и доска трекера.
- `team_members` — состав команд, `role_slug`.
- `system_roles` — глобальные роли (сид в `init.sql`).
- `org_roles` — роли организации.
- `mcp_oauth_clients` / `mcp_oauth_codes` / `mcp_oauth_tokens` — OAuth-сервер для удалённого MCP.

**Планер спринта**
- `task_positions` — позиция задачи на свимлейне (день, часть, длительность, план).
- `task_position_segments` — дробление фазы на отрезки.
- `sprint_plan_captures` — черновик и якорь плана на момент взятия в работу.
- `swimlane_card_layers` — ручной слой карточки в строке свимлейна.
- `task_links` — стрелки между карточками.
- `comments` — заметки, фото, схемы, виджеты на свимлейне.
- `comment_reactions` — реакции на заметки.
- `planner_files` — метаданные файлов планера (байты в S3, `storage_key`).
- `sprint_goals` — цели спринта (delivery / discovery).
- `sprint_feature_lanes` — черновые строки и порядок доски «по фичам».
- `occupancy_task_order` — порядок во вкладке «Занятость» (legacy).
- `board_availability_events` — отпуска, техспринты, больничные, дежурства по доске.

**Агент и предложения плана**
- `plan_patch_position_previews` / `plan_patch_goal_previews` — превью `propose_plan_patch` до apply.
- `agent_sessions` / `agent_session_messages` — сессии и переписка с агентом.

**Ретро и метрики**
- `retro_boards` — доска ретро спринта.
- `retro_column_templates` — шаблон колонок ретро организации.
- `sprint_metrics` — факты спринтов для дашборда метрик.

**Синхронизация с трекером** (подробно — [SYNC.md](./SYNC.md))
- `issue_snapshots` — нормализованный снимок задачи.
- `issue_changelog_events` — кеш changelog и комментариев задачи.
- `sync_runs` — журнал прогонов; уникальный индекс `uq_sync_runs_one_running_per_org` — не больше одного `running` на организацию.

**Уведомления и аналитика**
- `user_notifications` — in-app уведомления.
- `analytics_events` — append-only продуктовая аналитика.

**Фичи, стори, документы**
- `features`, `feature_documents`, `feature_diagrams`, `feature_grooming_diagrams`, `feature_grooming_todos` — фичи и их артефакты.
- `document_types` — справочник типов документов (сид), `document_versions` — история версий.
- `story_task_positions`, `story_draft_tasks`, `story_task_links` — доска планирования стори.

**Квартальное планирование** (архив, см. [QUARTERLY_PLANNING.md](./QUARTERLY_PLANNING.md))
- `quarterly_plans`, `quarterly_plan_v2_epics`, `quarterly_plan_v2_story_phases`, `quarterly_plan_v2_excluded_stories`, `quarterly_plan_v2_story_events`.

**Внешние таблицы (не создаются приложением)**
- `overseer.teams`, `overseer.staff_teams`, `overseer.staff_roles`, `overseer.roles`, `public.registry_employees` — проверяются preflight при `DB_CONTRACT_MODE=compatibility`; источник разового копирования в `add-staff-teams.sql`.
- `overseer.mv_ytracker_hd_count_changelog_events` — читают `lib/overseer/hdCountRead.ts` и `hdWeeklyHeatmapRead.ts`.

## Известные проблемы

SQL не исправлялся, здесь только фиксация.

1. **Нет учёта миграций.** Нельзя узнать, какие файлы применены к БД. Порядок задаёт только таблица выше.
2. **`init.sql` отстаёт от кода:** нет `quarterly_plan_v2_*`, `mcp_oauth_*`, колонок `agent_session_messages.options` / `skill_id` / `skill_params`, CHECK `comments_position_y_layer_shift_check`, индекса `uq_organizations_slug_lower`. Таблицы и колонки догоняет runtime-DDL, CHECK и индекс — нет.
3. **Колонки без SQL-миграции.** `comments.parent`, `pending_approval`, `pending_approval_expires_at`, `plan_patch_proposal_id` и `agent_session_messages.options` / `skill_id` / `skill_params` добавляет только runtime-DDL. Ни один `database/*.sql` их не создаёт.
4. **Зашитая схема `beer_tracker`** при `BEER_TRACKER_SCHEMA=public`:
   - `migrate-vacations-to-board-availability-events.sql` проверяет `vacations` в `information_schema` по `table_schema = 'beer_tracker'`. В `public` копирование пропускается, а `DROP TABLE IF EXISTS vacations` выполняется: данные отпусков теряются.
   - `add-sprint-goals-organization-id.sql` проверяет колонку в схеме `beer_tracker`. В `public`, если колонка уже есть, `ADD COLUMN organization_id` падает (транзакция откатывается).
   - `drop-issue-links.sql` и `cleanup-task-task-planner-links.sql` обращаются к `beer_tracker.*` напрямую. В `public` первый ничего не делает, второй падает.
5. **Неидемпотентные или разрушающие файлы:**
   - `migrate-planner-files-to-s3.sql` при каждом запуске делает `DELETE FROM comments WHERE kind='image' …` и `DELETE FROM planner_files`. Комментарий в файле про безопасный повтор неверен.
   - `add-comment-author.sql` делает `DROP COLUMN created_by` перед `ADD COLUMN`: повтор стирает авторов заметок.
   - `add-planner-comment-images.sql` и `migrate-planner-files-to-s3.sql` выставляют CHECK `comments.kind` без `widget`. После `add-comment-widget-kind.sql`, если в БД есть виджеты, `ADD CONSTRAINT` падает; если виджетов нет, CHECK сужается до следующего runtime-ensure.
   - `init.master-tenant-addon.sql`: `CREATE TRIGGER` без `DROP TRIGGER IF EXISTS`, повтор падает.
6. **`legacy-add-organization-id.sql`** зашивает UUID организации `9fd8ef6b-cfde-4180-a89a-d2865da61ad2`. На чужой БД файл падает с `Organization … not found`, пока UUID не поправят вручную.
7. **`uuid_generate_v4()`** в `add-planner-comment-images.sql` и `init.master-tenant-addon.sql` требует расширения `uuid-ossp`. `init.sql` и runtime используют `gen_random_uuid()`.
8. **`add-issue-links.sql`** — заглушка из одних комментариев, хотя по имени выглядит как миграция. Раньше [COMMERCIAL_DB_CONTRACT.md](./COMMERCIAL_DB_CONTRACT.md) приводил его как пример запуска.
9. **Runtime-DDL требует владения таблицами.** Приложение выполняет `CREATE TABLE` / `ALTER TABLE` при первом обращении (список выше). Ensure-функции пробрасывают ошибку, поэтому у роли без владения такие запросы падают даже на полностью доведённой схеме. Раньше COMMERCIAL_DB_CONTRACT.md утверждал, что DDL в runtime не нужен.
10. **Таблицы вне `BEER_TRACKER_TABLES`** (`features`, `story_*`, `sprint_metrics`, `quarterly_plan_v2_*` и др.) не получают префикс схемы. При `BEER_TRACKER_SCHEMA≠public` они резолвятся через `search_path` роли, а не через `BEER_TRACKER_SCHEMA`.
11. Мелочь: в `init.sql` `organizations` объявлена дважды (второй раз `CREATE TABLE IF NOT EXISTS`, без эффекта).
