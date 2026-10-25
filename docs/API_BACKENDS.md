# Каталог бэкендов Next.js API (`/api/*`)

Краткий указатель: **какой HTTP-маршрут к каким системам ходит**. Клиентский и серверный слои — [API_DOCUMENTATION.md](./API_DOCUMENTATION.md). Tenant, токены трекера и realtime — [ARCHITECTURE.md](../ARCHITECTURE.md).

## Типы бэкендов

| Тип | Где в коде | Назначение |
|-----|------------|------------|
| **Issue tracker** (Yandex Tracker **или** Jira) | `lib/issueTrackerProvider/*` (`getIssueTrackerProviderClientFromRequest`); легаси — `lib/trackerApi/*`, `getTrackerApiFromRequest` | Живые данные трекера, мутации, часть чтений (спринты, доски, workflow, детали issue). Выбор: `organizations.settings.issueTracker` — [ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md) |
| **Снимки задач (PostgreSQL)** | `lib/snapshots/*` | `issue_snapshots` (бэклог, burndown/score, карточка задачи); `issue_changelog_events` — кэш changelog и комментариев задач |
| **PostgreSQL (приложение)** | репозитории `lib/<домен>/*Repository.ts` поверх `lib/db` | Организации, команды, позиции, связи, комментарии, цели спринта, фичи, ретро, уведомления, OAuth MCP и т.д. |
| **S3 (совместимое API)** | `lib/storage` | Байты фотокарточек и сцен Excalidraw планера (`planner_files.storage_key`) |
| **Redis** | `lib/realtime/*`, `lib/sync/queue.ts` (BullMQ) | Pub/sub realtime, присутствие и таймер спринта; очередь синхронизации снимков. Без Redis realtime работает в памяти процесса |
| **Внешний HTTP** | `fetch` в `lib/<домен>` | isdayoff.ru (праздники), CalDAV, deployhoroscope.ru, превью ссылок |
| **Локальная ФС** | `fs` / `public/uploads` | Загрузка SVG диаграмм фич |

Маршрут может быть **смешанным**: например burndown сочетает трекер (спринт, задачи, changelog), `issue_snapshots` и merged payload задач.

## Таблица по областям `app/api`

Пути указаны относительно префикса **`/api`**. Точные файлы: `app/api/**/route.ts`. «Tenant» — организация из `x-organization-id` или пути (см. ARCHITECTURE.md).

| Область | Примеры путей | Основные бэкенды |
|---------|---------------|------------------|
| Issues (создание, статус, спринт, работа, связанные, чеклист, переходы, поиск, связи) | `/issues`, `/issues/search`, `/issues/[issueKey]/status`, `.../sprint`, `.../update-work`, `.../create-related`, `.../checklist`, `.../transitions`, `.../transitions/[transitionId]/fields`, `.../links`, `/issues/links/batch`, `/issues/transitions/batch` | Tracker |
| Issue как `Task` для UI (карточка) | `/issues/[issueKey]/task` | `issue_snapshots` + Tracker + tenant |
| Issue детально (GET/PATCH и т.д.) | `/issues/[issueKey]` | `issue_snapshots` + Tracker (чеклист, fallback если нет снимка) + tenant |
| Changelog задачи | `/issues/[issueKey]/changelog` | Кэш `issue_changelog_events`, при промахе — Tracker (changelog / comments) с записью в кэш |
| Changelog batch | `/issues/changelog` | Только кэш `issue_changelog_events` |
| Статусы родителей | `/issues/parent-statuses` | `issue_snapshots` (batch) + tenant |
| SLA-баги | `/boards/[boardId]/sla-bugs`, `/issues/[issueKey]/sla-bug-close-action`, `/issues/[issueKey]/hd-weekly-heatmap` | Tracker + PostgreSQL (команда доски, счётчики HD); heatmap — только PostgreSQL |
| Бэклог | `/backlog` | `issue_snapshots` + `teams`/`staff`/`team_members` (мердж разработчиков) + tenant |
| Доски | `/boards` | PostgreSQL `teams` (доски команд, видимые профилю) |
| Параметры доски | `/boards/[boardId]` | Tracker (серверный кэш) |
| Метрики спринтов доски | `/boards/[boardId]/sprint-metrics` | Tracker + `issue_snapshots` (через источник burndown) + PostgreSQL (сохранённые метрики) |
| Спринты (список/создание) | `/sprints` | Tracker |
| Статус спринта | `/sprints/[sprintId]/status` | Tracker |
| Burndown | `/sprints/[sprintId]/burndown` | Tracker (задачи спринта, changelog по задачам) + `issue_snapshots` (доп. задачи; merge по ключу) + tenant |
| Score спринта | `/sprints/[sprintId]/score` | Tracker (имя спринта) + агрегат SP/TP из `issue_snapshots` + цели из `sprint_goals` |
| Velocity исполнителей | `/sprints/assignee-velocity` | Tracker + `issue_snapshots` |
| Контекст спринта (для агентов/MCP) | `/sprints/[sprintId]/sprint-context` | Tracker + PostgreSQL |
| Позиции в свимлейне | `/sprints/[sprintId]/positions`, `.../positions/batch`, `.../positions/clear` | PostgreSQL + Tracker |
| Ручные слои карточек | `/sprints/[sprintId]/lane-layers` | PostgreSQL (приложение) |
| Связи задач в спринте | `/sprints/[sprintId]/links`, `.../batch`, `.../clear` | PostgreSQL (приложение) |
| Комментарии (заметки) планера | `/sprints/[sprintId]/comments`, `.../comments/image`, `.../comments/diagram`, `.../comments/[commentId]/image`, `.../diagram`, `.../reactions`, `.../approve`, `.../comments/move`, `.../comments/pending` | PostgreSQL + S3 (фотокарточки и схемы Excalidraw) |
| Ретро | `/sprints/[sprintId]/retro` | PostgreSQL (приложение) |
| Таймер спринта | `/sprints/[sprintId]/timer` | Redis или память процесса |
| Превью плана от агента | `/sprints/[sprintId]/plan-patch-previews`, `.../plan-patch-goal-previews` | PostgreSQL (+ Tracker для задач) |
| Сессии агентов | `/sprints/[sprintId]/agent-sessions`, `/agent-sessions/[sessionId]`, `.../messages` | PostgreSQL (приложение) |
| Строки фич планера | `/sprints/[sprintId]/feature-lanes` | PostgreSQL (приложение) |
| События доступности (отпуск, техспринт, больничный, дежурство) | `/quarterly-plans/availability/board-events` (URL исторический) | PostgreSQL (приложение), `lib/boardAvailability/` |
| Цели спринта | `/sprint-goals`, `/sprint-goals/[id]` | PostgreSQL (приложение) |
| Фичи, документы, диаграммы, груминг (deprecated) | `/features`, `/features/[featureId]/**` | PostgreSQL (приложение) |
| Картинка диаграммы фичи | `/features/[featureId]/diagrams/[diagramId]/image` | Локальная ФС |
| Типы документов | `/document-types` | PostgreSQL (приложение) |
| Задачи спринта для планера | `/tracker` | Tracker + `issue_snapshots` (кроме `skipSnapshots=1`) + PostgreSQL (сохранённый порядок из `occupancy_task_order` — только чтение, аватары `staff`, команда по `boardId`) + tenant |
| Экраны, очереди, поля | `/screens/*`, `/queues/*`, `/fields/*` | Tracker |
| Realtime | `/realtime` (SSE), `/realtime/presence` | Redis pub/sub или шина в памяти процесса |
| Сессия и вход | `/auth/session`, `/auth/logout`, `/auth/onprem/tracker-session`, `/auth/register`, `/auth/yandex/*`, `/auth/atlassian/*` | PostgreSQL (пользователи, cookie сессии) + Tracker (проверка токена) / OAuth провайдера |
| Парольный вход | `/auth/login` | Отключён, всегда 401 |
| Текущий пользователь (трекер) | `/auth/myself` | Tracker; опционально `staff` (аватар, birthdate) при `x-organization-id` и членстве |
| Проверка токена трекера | `/auth/validate-token` | Tracker (`createTrackerApiClient`) |
| Организации (настройки для участников) | `/organizations`, `/organizations/[organizationId]/**` (planner-timeline, retro-template, holiday-country, planner-integration-rules, tracker-fields) | PostgreSQL; `tracker-fields` — + Tracker |
| Админка организации | `/admin/organizations/[organizationId]/**` (участники, роли, команды, staff, трекер, интеграция, sync) | PostgreSQL; `tracker/verify`, `tracker-metadata`, `teams/tracker-catalog`, `users/search`, `tracker-integration/init-status-defaults` — + Tracker; `sync/*` — + очередь BullMQ (Redis) |
| On-prem | `/onprem/setup-state`, `/onprem/default-organization` | PostgreSQL |
| Внутренние (cron, контракт БД) | `/internal/sync/tick`, `/internal/sync/full-rescan`, `/internal/db-contract/status` | `sync/tick` — очередь BullMQ (Redis); `sync/full-rescan` — синк Tracker → `issue_snapshots` в запросе; `db-contract/status` — PostgreSQL |
| MCP и OAuth для агентов | `/mcp`, `/oauth/authorize`, `/oauth/token`, `/oauth/register`, `/oauth/revoke` | PostgreSQL + все домены планера (инструменты MCP) |
| Уведомления | `/notifications`, `/notifications/[notificationId]`, `.../read` | PostgreSQL (приложение) |
| Аналитика | `/analytics/events` | PostgreSQL (приложение) |
| Участники команд | `/teams/members`, `/teams/members/search`, `/teams/members/registry-search` | PostgreSQL `teams` / `staff` / `team_members` + tenant |
| Сотрудники реестра | `/users/search`, `/users/[trackerId]` | PostgreSQL `staff` + tenant |
| Праздники (прокси) | `/holidays/isdayoff` | Внешний HTTP (isdayoff.ru) |
| Календарь | `/calendar/caldav/events` | Внешний HTTP (CalDAV) |
| Гороскоп релиза | `/release-horoscope/day` | Внешний HTTP (deployhoroscope.ru) |
| Превью ссылок | `/link-preview` | Внешний HTTP (HTML страницы) |
| Загрузка файлов | `/files/upload` | Локальная ФС |

## Как проверить при изменениях

В корне репозитория:

- Трекер: `rg "getIssueTrackerProviderClientFrom|getIssueTrackerProviderClientForOrganization|getTrackerApiFromRequest" app/api lib`
- Снимки: `rg "lib/snapshots" app/api lib`
- Realtime-уведомления: `rg "notifySprintRealtime" app/api lib`
- Нормализация changelog для burndown/UI: `lib/ytrackerRawIssues.ts`, `lib/issueTrackerProvider/changelogNormalizer.ts`

Маршруты не импортируют `lib/db` напрямую (`api/no-direct-db`), поэтому бэкенд часто виден только в `lib/<домен>`, который вызывает route. При добавлении маршрута обновите эту таблицу или соответствующую строку.

## См. также

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — правила клиента и сервера
- [ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md) — поддерживаемые трекеры
