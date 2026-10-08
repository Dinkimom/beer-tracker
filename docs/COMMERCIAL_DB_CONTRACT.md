# Схема приложения: каталог и runtime

Beer Tracker хранит команды и сотрудников **у себя**: `teams`, `staff`, `team_members` в схеме `BEER_TRACKER_SCHEMA` (по умолчанию `public`, как в `database/init.sql`). Это не внешний реестр `public.registry_employees` и не `overseer.teams`. Legacy-инстансы могут держать таблицы в схеме `beer_tracker` через `BEER_TRACKER_SCHEMA=beer_tracker`.

Трекер задач (Яндекс Трекер или Jira) — отдельный переключатель инстанса: `ISSUE_TRACKER_PROVIDER` + `TRACKER_API_URL`. На доску и логин влияют email и `staff.tracker_user_id` (uid Яндекса или Jira `accountId`).

## 1) Откуда берётся схема

| Ситуация | Что применить |
|----------|----------------|
| Чистая БД | `database/init.sql` (Docker: `docker-entrypoint-initdb.d`, только **первый** старт тома) |
| Уже живая БД без `staff`/`teams` | `database/add-staff-teams.sql` |
| Уже живая БД без `staff.avatar_url` | `database/add-staff-avatar-url.sql` |
| Уже живая БД: `sprint_goals` без `organization_id` | `database/add-sprint-goals-organization-id.sql` |
| Только слой организаций на чужой Postgres | `database/init.master-tenant-addon.sql`, затем `add-staff-teams.sql` |

Миграции в `database/*.sql` (кроме `init.sql`) читают psql-переменную `schema` из `BEER_TRACKER_SCHEMA` и выставляют `search_path`. Запускайте через обёртку:

```bash
./scripts/db/psql-with-schema.sh -h localhost -p 5433 -U postgres -d beer_tracker \
  -f database/add-staff-teams.sql
# legacy-схема:
BEER_TRACKER_SCHEMA=beer_tracker ./scripts/db/psql-with-schema.sh -f database/add-issue-links.sql
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

Синхронизация с трекером: `issue_snapshots`, `issue_changelog_events`, `sync_runs`.

Организация: `organizations`, `organization_secrets`, `system_roles`, `org_roles`.

## 4) Что не является каталогом

`overseer.*` и `public.registry_employees` больше не источник команд и логина. Если таблицы ещё стоят в БД, их можно оставить как архив или как источник **одноразового** копирования в `add-staff-teams.sql`.

Чтение сырых задач из `overseer.ytracker_raw_issues` (fallback, если снимки пусты) и `DB_CONTRACT_MODE=compatibility` к каталогу staff/teams не относятся.

## 5) Права

Техпользователю приложения: `USAGE` + `SELECT, INSERT, UPDATE, DELETE` на объекты схемы `BEER_TRACKER_SCHEMA`, `USAGE, SELECT` на sequence. DDL в runtime не нужен. В production приложению не выдавать `CREATE` / `ALTER` / `DROP`.
