# Схема приложения: каталог и runtime

Beer Tracker хранит команды и сотрудников **у себя**: `teams`, `staff`, `team_members` в схеме `BEER_TRACKER_SCHEMA` (по умолчанию `public`). Это не внешний реестр `public.registry_employees` и не `overseer.teams`. Legacy-инстансы могут держать таблицы в схеме `beer_tracker` через `BEER_TRACKER_SCHEMA=beer_tracker`.

Трекер задач (Яндекс Трекер или Jira) — настройка организации в БД: `organizations.settings.issueTracker` (`provider` + `apiUrl`), задаётся на `/register` и в админке. На доску и логин влияют email и `staff.tracker_user_id` (uid Яндекса или Jira `accountId`).

## 1) Откуда берётся схема

| Ситуация | Что применить |
|----------|----------------|
| Чистая БД, обновление на новую версию, БД от старого `init.sql` | миграции `database/migrations/`: применяются при старте app или `pnpm db:migrate`, в схему `BEER_TRACKER_SCHEMA` ([DATABASE.md](./DATABASE.md#как-применяется-схема)) |
| Каталог команд ещё в `overseer.*` / `registry_employees` | `database/legacy/add-staff-teams.sql` (разовое копирование) |
| `staff.avatar_url` пустые, аватары есть в `registry_employees` | `database/legacy/add-staff-avatar-url.sql` |
| `sprint_goals` без `organization_id` в строках | `database/legacy/add-sprint-goals-organization-id.sql` (корректно отрабатывает только со схемой `beer_tracker`, см. [DATABASE.md](./DATABASE.md#известные-проблемы)) |
| Трекер был задан в env (`ISSUE_TRACKER_PROVIDER`, `TRACKER_API_URL`) | `database/legacy/add-organization-issue-tracker-settings.sql` с `-v provider=… -v api_url=…` |

Скрипты из `database/legacy/` читают psql-переменную `schema` из `BEER_TRACKER_SCHEMA` и выставляют `search_path`. Запускайте через обёртку:

```bash
./scripts/db/psql-with-schema.sh -h localhost -p 5433 -U postgres -d beer_tracker \
  -f database/legacy/add-staff-teams.sql
# legacy-схема:
BEER_TRACKER_SCHEMA=beer_tracker ./scripts/db/psql-with-schema.sh -f database/legacy/add-staff-avatar-url.sql
```

`add-staff-teams.sql` идемпотентен. Если в той же БД ещё есть `overseer.teams` и `public.registry_employees`, один раз копирует каталог в самую старую `organizations` (id команд = `overseer.teams.uid`, id сотрудников = `registry_employees.uuid`, чтобы совпасть с уже выданными сессиями и `admins.staff_uid`).

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

## 5) Права

Техпользователю приложения: `USAGE` + `SELECT, INSERT, UPDATE, DELETE` на объекты схемы `BEER_TRACKER_SCHEMA`, `USAGE, SELECT` на sequence.

DDL приложение выполняет только в миграциях при старте (`DB_MIGRATIONS_AUTO`, по умолчанию включено). Для этого роли нужно право `CREATE` в схеме и владение её таблицами: `ALTER TABLE` в PostgreSQL требует владельца. Если техпользователю DDL не дают, задайте `DB_MIGRATIONS_AUTO=false` и запускайте `pnpm db:migrate` под ролью-владельцем перед стартом каждой новой версии. В обычной работе запросы приложения DDL не делают.
