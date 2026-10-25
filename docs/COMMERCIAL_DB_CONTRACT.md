# Схема приложения: каталог и runtime

Beer Tracker хранит команды и сотрудников **у себя**: `teams`, `staff`, `team_members` в схеме `BEER_TRACKER_SCHEMA` (по умолчанию `public`, как в `database/init.sql`). Это не внешний реестр `public.registry_employees` и не `overseer.teams`. Legacy-инстансы могут держать таблицы в схеме `beer_tracker` через `BEER_TRACKER_SCHEMA=beer_tracker`.

Трекер задач (Яндекс Трекер или Jira) — настройка организации в БД: `organizations.settings.issueTracker` (`provider` + `apiUrl`), задаётся на `/register` и в админке. На доску и логин влияют email и `staff.tracker_user_id` (uid Яндекса или Jira `accountId`).

## 1) Откуда берётся схема

| Ситуация | Что применить |
|----------|----------------|
| Чистая БД | `database/init.sql` (Docker: `docker-entrypoint-initdb.d`, только **первый** старт тома). Таблицы создаются в `public` |
| Уже живая БД без `staff`/`teams` | `database/add-staff-teams.sql` |
| Уже живая БД без `staff.avatar_url` | `database/add-staff-avatar-url.sql` |
| Уже живая БД: `sprint_goals` без `organization_id` | `database/add-sprint-goals-organization-id.sql` (корректно отрабатывает только со схемой `beer_tracker`, см. [DATABASE.md](./DATABASE.md#известные-проблемы)) |
| Уже живая БД: трекер был задан в env (`ISSUE_TRACKER_PROVIDER`, `TRACKER_API_URL`) | `database/add-organization-issue-tracker-settings.sql` с `-v provider=… -v api_url=…` |
| Только слой организаций на чужой Postgres | `database/init.master-tenant-addon.sql`, затем `add-staff-teams.sql` |
| Обновление на новую версию | файлы из `database/`, добавленные после версии тома: [DATABASE.md](./DATABASE.md#порядок-миграций) |

Миграции в `database/*.sql` (кроме `init.sql`) читают psql-переменную `schema` из `BEER_TRACKER_SCHEMA` и выставляют `search_path`. Запускайте через обёртку:

```bash
./scripts/db/psql-with-schema.sh -h localhost -p 5433 -U postgres -d beer_tracker \
  -f database/add-staff-teams.sql
# legacy-схема:
BEER_TRACKER_SCHEMA=beer_tracker ./scripts/db/psql-with-schema.sh -f database/add-staff-avatar-url.sql
```

`add-staff-teams.sql` идемпотентен: таблицы создаёт через `IF NOT EXISTS`. Если в той же БД ещё есть `overseer.teams` и `public.registry_employees`, один раз копирует каталог в самую старую `organizations` (id команд = `overseer.teams.uid`, id сотрудников = `registry_employees.uuid`, чтобы совпасть с уже выданными сессиями и `admins.staff_uid`).

Том Docker, созданный по старому `init.sql` без этих таблиц, **сам не обновится** — нужен этот файл (или новый том).

## 2) Каталог организации

- `teams` — очередь (`tracker_queue_key`) и доска (`tracker_board_id`) выбранного трекера
- `staff` — человек в организации: `email`, `tracker_user_id`, `display_name`, `avatar_url`
- `team_members` — состав команды (`role_slug` из каталога ролей)
- `admins.staff_uid` — `staff.id` (доступ в админку)

Состав команд правится в админке. `DB_CONTRACT_MODE` на этот каталог не влияет.

## 3) Остальной runtime

Планер: `task_positions`, `task_position_segments`, `task_links`, `comments`, `board_availability_events`, …

Синхронизация с трекером: `issue_snapshots`, `issue_changelog_events`, `sync_runs` ([SYNC.md](./SYNC.md)).

Организация: `organizations`, `organization_secrets`, `system_roles`, `org_roles`.

Полный список таблиц по доменам — [DATABASE.md](./DATABASE.md#таблицы-по-доменам).

## 4) Что не является каталогом

`overseer.*` и `public.registry_employees` больше не источник команд и логина. Если таблицы ещё стоят в БД, их можно оставить как архив или как источник **одноразового** копирования в `add-staff-teams.sql`.

`DB_CONTRACT_MODE=compatibility` к каталогу staff/teams не относится. Он включает только preflight на старте (`lib/dbContractPreflight.ts`): наличие схем `overseer` / `public`, таблиц `overseer.teams`, `staff_teams`, `staff_roles`, `roles`, `public.registry_employees`, их ключевых колонок и прав на чтение. При `DB_CONTRACT_PREFLIGHT_STRICT=true` несоответствие роняет старт, иначе пишется warning. Отчёт: `GET /api/internal/db-contract/status` с `SYNC_CRON_SECRET`.

Отдельно от режима HD-метрики вкладки «Баги» читают `overseer.mv_ytracker_hd_count_changelog_events` (`lib/overseer/hdCountRead.ts`, `hdWeeklyHeatmapRead.ts`).

## 5) Права

Техпользователю приложения: `USAGE` + `SELECT, INSERT, UPDATE, DELETE` на объекты схемы `BEER_TRACKER_SCHEMA`, `USAGE, SELECT` на sequence.

Приложение выполняет DDL в runtime: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, перестройка CHECK при смене сетки таймслотов. Список модулей — в [DATABASE.md](./DATABASE.md#runtime-ddl-самолечение-схемы). `ALTER TABLE` в PostgreSQL требует владельца таблицы даже с `IF NOT EXISTS`. Ensure-функции пробрасывают ошибку дальше, поэтому у роли без владения такие запросы падают. Роли приложения нужно владение объектами схемы `BEER_TRACKER_SCHEMA`.
