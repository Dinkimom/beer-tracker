# База данных

PostgreSQL 16 (`postgres:16-alpine` в `docker-compose.yml`). Как схема попадает в БД, как обновлять живую БД, какие таблицы за что отвечают.

Связанные документы: [COMMERCIAL_DB_CONTRACT.md](./COMMERCIAL_DB_CONTRACT.md) (каталог staff/teams, права, `DB_CONTRACT_MODE`), [SYNC.md](./SYNC.md) (таблицы синхронизации), [INSTALL.md](./INSTALL.md).

## Как применяется схема

Схему ведут нумерованные миграции `database/migrations/NNNN_<имя>.sql`. Раннер — `lib/dbMigrations/runDbMigrations.ts`.

| Когда | Что запускает |
|-------|---------------|
| Старт сервера Next.js | `instrumentation.ts` → `runDbMigrations()` до preflight и до первого запроса. Ошибка миграции останавливает старт. Выключается `DB_MIGRATIONS_AUTO=false` |
| Вручную | `pnpm db:migrate`: те же `POSTGRES_*` / `PG*` и `BEER_TRACKER_SCHEMA`, `.env` подхватывается |

Как работает раннер:

- Применённые файлы записаны в `schema_migrations` (`name`, `checksum`, `applied_at`, `duration_ms`) в схеме `BEER_TRACKER_SCHEMA`. Схему и таблицу учёта раннер создаёт сам.
- Файлы идут по порядку имени. Каждый файл выполняется в своей транзакции с `SET LOCAL search_path TO <BEER_TRACKER_SCHEMA>`, поэтому в SQL имена таблиц пишутся без схемы. Ошибка откатывает файл целиком.
- Advisory lock на схему: реплики приложения и `pnpm db:migrate` не применяют миграции одновременно, второй процесс ждёт первого.
- Подключение отдельное от пула, без `statement_timeout` (у пула 10 с).
- Файл, который поменяли после применения, повторно не запускается, раннер пишет предупреждение. Запись в `schema_migrations` без файла (БД новее релиза, например после отката версии) тоже только предупреждение.

Sync-worker миграции не запускает. На пустой БД он падает на первом запросе и перезапускается (`restart: unless-stopped`), пока app не создаст схему.

Роль приложения должна иметь право DDL в схеме (создавать таблицы, менять свои). Если прод-роль без DDL, задайте `DB_MIGRATIONS_AUTO=false` и запускайте `pnpm db:migrate` под ролью-владельцем при каждом обновлении. Подробнее про права — [COMMERCIAL_DB_CONTRACT.md](./COMMERCIAL_DB_CONTRACT.md).

### Baseline `0001_baseline.sql`

Первая миграция — вся схема на 2026-10-25. Она идемпотентная и подходит для любой БД:

- **пустая** — создаёт все таблицы, индексы, триггеры и справочники (`document_types`, `system_roles`);
- **созданная прежним `database/init.sql`** (любой версии, включая v1.0.0 в схеме `beer_tracker`) или догнанная runtime-DDL — добавляет недостающие таблицы (`mcp_oauth_*` и т.п.) и колонки, расширяет CHECK-и (день 0..399, часть дня 0..3, виды заметок и уведомлений), перестраивает PK превью на `owner_id`, переводит `planner_files` с BYTEA на `storage_key`.

Перевод `planner_files` удаляет фото и схемы, если в БД ещё есть BYTEA-колонка `data`: байты в S3 не переносятся. Так же раньше делал runtime-DDL при первом обращении.

Проверено на postgres:16: схема после baseline на пустой БД и на БД от каждой версии `init.sql` из истории git совпадает со схемой «последний `init.sql` + runtime-DDL» (колонки, CHECK, FK, индексы, триггеры). Отличия только у БД из v1.0.0: `organizations.slug` остаётся `citext`, у старых таблиц дефолт `uuid_generate_v4()`. Повторный прогон ничего не меняет.

### Как добавить миграцию

1. Новый файл `database/migrations/NNNN_<что_делает>.sql`, номер — следующий по порядку. Имя: цифры и `snake_case`.
2. Таблицы без схемы (`ALTER TABLE comments …`). `BEGIN` / `COMMIT` не писать: файл уже в транзакции. Не использовать то, что не работает в транзакции (`CREATE INDEX CONCURRENTLY`, `VACUUM`).
3. Применённый файл не править: исправление — новой миграцией.
4. Новую таблицу добавить в `BEER_TRACKER_TABLES` в `lib/db.ts`, иначе `query()` не подставит ей схему.
5. Проверить локально: `pnpm db:migrate` на копии БД и повторный запуск.

### `database/legacy/`

Разовые скрипты переноса данных, которые baseline не повторяет. Нужны только при переезде со старых инсталляций. Запуск через `./scripts/db/psql-with-schema.sh` (или `pnpm db:psql`), он передаёт `schema` из `BEER_TRACKER_SCHEMA`:

```bash
./scripts/db/psql-with-schema.sh -h localhost -p 5433 -U postgres -d beer_tracker \
  -f database/legacy/add-staff-teams.sql
```

| Файл | Что делает | Повтор |
|------|------------|--------|
| `legacy-add-organization-id.sql` | `organization_id` в таблицах планера single-tenant инсталляций до v1.0.0 | да, но UUID организации зашит в файл |
| `add-staff-teams.sql` | разовое копирование команд и сотрудников из `overseer.*` / `registry_employees` | да |
| `add-staff-avatar-url.sql` | бэкфилл `staff.avatar_url` из `registry_employees` | да |
| `add-sprint-goals-organization-id.sql` | бэкфилл `sprint_goals.organization_id` | только при схеме `beer_tracker` |
| `migrate-vacations-to-board-availability-events.sql` | `vacations` → `board_availability_events`, затем `DROP TABLE vacations` | да; при `public` данные теряются, см. ниже |
| `add-organization-issue-tracker-settings.sql` | перенос `ISSUE_TRACKER_PROVIDER` / `TRACKER_API_URL` из env в `organizations.settings.issueTracker` (`-v provider=… -v api_url=…`) | да |
| `cleanup-task-task-planner-links.sql` | удаляет связи задача↔задача из `beer_tracker.task_links` | да |
| `drop-issue-links.sql` | `DROP TABLE beer_tracker.issue_links` (таблица удалённой фичи) | да |

Остальные прежние `database/*.sql` и `database/init.sql` удалены 2026-10-25: их схему покрывает baseline. История — в git.

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
- `system_roles` — глобальные роли (сид в baseline).
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
- `occupancy_task_order` — сохранённый порядок задач удалённой вкладки «Занятость». Сервер только читает его для сортировки задач спринта (`lib/tracker/trackerRouteHelpers.ts`), записи больше нет.
- `board_availability_events` — отпуска, техспринты, больничные, дежурства по доске.

**Агент и предложения плана**
- `plan_patch_position_previews` / `plan_patch_goal_previews` — превью `propose_plan_patch` до apply.
- `plan_patch_applied_tokens` — применённые токены `apply_plan_patch`: повтор того же токена отвергается.
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

**Без кода** — `story_*`, `quarterly_plans`, `quarterly_plan_v2_*`, см. [Таблицы без кода](#таблицы-без-кода-удаление-отложено).

**Внешние таблицы (не создаются приложением)**
- `overseer.teams`, `overseer.staff_teams`, `overseer.staff_roles`, `overseer.roles`, `public.registry_employees` — проверяются preflight при `DB_CONTRACT_MODE=compatibility`; источник разового копирования в `add-staff-teams.sql`.

## Известные проблемы

1. **Зашитая схема `beer_tracker`** в `database/legacy/` при `BEER_TRACKER_SCHEMA=public`:
   - `migrate-vacations-to-board-availability-events.sql` ищет `vacations` по `table_schema = 'beer_tracker'`. В `public` копирование пропускается, а `DROP TABLE IF EXISTS vacations` выполняется: данные отпусков теряются.
   - `add-sprint-goals-organization-id.sql` проверяет колонку в схеме `beer_tracker`. В `public`, если колонка уже есть, `ADD COLUMN organization_id` падает.
   - `drop-issue-links.sql` и `cleanup-task-task-planner-links.sql` обращаются к `beer_tracker.*` напрямую. В `public` первый ничего не делает, второй падает.
2. **`legacy-add-organization-id.sql`** зашивает UUID организации `9fd8ef6b-cfde-4180-a89a-d2865da61ad2`. На чужой БД файл падает с `Organization … not found`, пока UUID не поправят вручную.
3. **Таблицы вне `BEER_TRACKER_TABLES`** (`features`, `sprint_metrics` и др.) не получают префикс схемы в `query()`. При `BEER_TRACKER_SCHEMA≠public` они резолвятся через `search_path` роли, а миграции создают их в `BEER_TRACKER_SCHEMA`. Роли нужен `search_path`, в котором эта схема идёт первой.

## Таблицы без кода (удаление отложено)

2026-10-25 из кода удалены квартальное планирование, редактор эпиков и вкладка «Занятость». Таблицы этих фич **не удалены**: в PR убирали только код, чтобы откат релиза не терял данные.

| Таблица | Чья была | Кто создаёт | Код сейчас |
|---------|----------|-------------|------------|
| `quarterly_plans` | Квартальный план | baseline | нет |
| `quarterly_plan_v2_epics`, `quarterly_plan_v2_story_phases`, `quarterly_plan_v2_excluded_stories`, `quarterly_plan_v2_story_events` | Квартальный план v2 | только старые инсталляции (файл `quarterly_plan_v2_tables.sql` удалён, в baseline их нет) | нет |
| `story_task_positions`, `story_draft_tasks`, `story_task_links` | Редактор эпиков / стори | baseline | нет |

Не путать: `board_availability_events` (отпуска, техспринты) — живая таблица, хоть роут и остался под `/api/quarterly-plans/availability/board-events`. `occupancy_task_order` тоже живая: её читают при сортировке задач.

Как удалять:

1. Не раньше, чем релиз без этого кода поработает в проде и откат на старую версию станет не нужен.
2. Отдельной миграцией `database/migrations/NNNN_drop_removed_feature_tables.sql` с `DROP TABLE IF EXISTS` для таблиц выше, с бэкапом перед запуском.
3. В том же PR: убрать имена из `BEER_TRACKER_TABLES` в `lib/db.ts` и строки из этой таблицы.

