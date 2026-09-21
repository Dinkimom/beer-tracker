# Каталог бэкендов Next.js API (`/api/*`)

Краткий указатель: **какой HTTP-маршрут к каким системам ходит**. Детали контрактов и клиентского слоя — в [API_DOCUMENTATION.md](./API_DOCUMENTATION.md). Авторизация к трекеру — [ARCHITECTURE.md](../ARCHITECTURE.md) и `getTrackerApiFromRequest` в `lib/api-tracker.ts`.

## Типы бэкендов

| Тип | Где в коде | Назначение |
|-----|------------|------------|
| **Issue tracker** (Yandex Tracker **или** Jira) | `lib/issueTrackerProvider/*`, `getTrackerApiFromRequest` / `lib/trackerApi/*` | Живые данные трекера, мутации, часть чтений (спринты, доски, workflow, детали issue). Выбор: `ISSUE_TRACKER_PROVIDER` — [ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md) |
| **Снимки задач (PostgreSQL)** | `lib/snapshots/*` | Чтение `issue_snapshots` (бэклог, эпики, стори, burndown/score); таблица `issue_changelog_events` — для будущего экспортёра |
| **PostgreSQL (приложение)** | `lib/db` (`query`, `pool`) | Позиции, связи, комментарии, цели спринта, фичи, квартальные планы (часть), черновики и т.д. |
| **S3 (совместимое API)** | `lib/storage` | Байты фотокарточек и сцен Excalidraw планера (`planner_files.storage_key`) |
| **Внешний HTTP** | `fetch` в route | Публичные API без своей БД (календарь, шутка) |
| **Локальная ФС** | `fs` / `public/uploads` | Загрузка SVG диаграмм фич |

Маршрут может быть **смешанным**: например burndown сочетает Tracker (спринт, задачи, пагинация changelog), `issue_snapshots` и merged payload задач.

## Таблица по областям `app/api`

Пути указаны относительно префикса **`/api`**. Точные файлы: `app/api/**/route.ts`.

| Область | Примеры путей | Основные бэкенды |
|---------|---------------|------------------|
| Issues (список, статус, спринт, работа, связанные, чеклист, переходы) | `/issues`, `/issues/[issueKey]/status`, `.../sprint`, `.../update-work`, `.../create-related`, `.../checklist`, `.../transitions`, batch transitions | Tracker |
| Issue как `Task` для UI (карточка) | `/issues/[issueKey]/task` | PostgreSQL `issue_snapshots` + tenant |
| Issue детально (GET/PATCH и т.д.) | `/issues/[issueKey]` | `issue_snapshots` + Tracker (чеклист, fallback если нет снимка) + tenant |
| Changelog (issue и batch) | `/issues/[issueKey]/changelog`, `/issues/changelog` | Issue tracker API (changelog / comments) + tenant |
| Статусы родителей | `/issues/parent-statuses` | PostgreSQL `issue_snapshots` (batch) + tenant |
| Бэклог | `/backlog` | PostgreSQL `issue_snapshots` + `teams`/`staff`/`team_members` (мердж разработчиков) + tenant |
| Эпики (список, deep) | `/epics`, `/epics/[epicKey]/deep` | PostgreSQL `issue_snapshots` + tenant + `teams` по `boardId` |
| Задачи эпика | `/epics/[epicKey]/tasks` | Tracker |
| Стори (список, карточка) | `/stories`, `/stories/[storyKey]` | PostgreSQL `issue_snapshots` + tenant |
| Задачи стори | `/stories/[storyKey]/tasks` | Tracker (in-memory кэш в процессе) |
| Позиции/ссылки/черновики стори | `/stories/[storyKey]/task-positions`, `.../links`, `.../draft-tasks` | PostgreSQL (приложение) |
| Доски | `/boards` | Tracker + PostgreSQL `teams` (tenant); `/boards/[boardId]` — только Tracker (параметры доски) |
| Спринты (список/создание) | `/sprints` | Tracker |
| Статус спринта | `/sprints/[sprintId]/status` | Tracker |
| Burndown | `/sprints/[sprintId]/burndown` | Tracker (список задач спринта, changelog по каждой задаче) + PostgreSQL `issue_snapshots` (доп. задачи по спринту; merge по ключу) + tenant |
| Score спринта | `/sprints/[sprintId]/score` | Tracker (имя спринта) + агрегат SP/TP из `issue_snapshots` + цели из PostgreSQL `sprint_goals` |
| Позиции в свимлейне | `/sprints/[sprintId]/positions`, `.../positions/batch`, `.../positions/clear` | PostgreSQL + Tracker |
| Связи задач в спринте | `/sprints/[sprintId]/links`, `.../batch`, `.../clear` | PostgreSQL (приложение) |
| Комментарии планера | `/sprints/[sprintId]/comments`, `.../image`, `.../diagram` | PostgreSQL + S3 (фотокарточки и схемы Excalidraw) |
| Порядок занятости | `/sprints/[sprintId]/occupancy-task-order` | PostgreSQL (приложение) |
| Строки фич планера | `/sprints/[sprintId]/feature-lanes` | PostgreSQL (приложение) |
| Batch позиций/связей (несколько спринтов) | `/sprints/batch/positions`, `/sprints/batch/links` | PostgreSQL (приложение) |
| Родители задач (batch) | `/sprints/batch/task-parents` | Tracker |
| Квартальные планы v2 (deprecated) | `/quarterly-plans/v2` | PostgreSQL (приложение) + Tracker |
| Участники квартала | `/quarterly-plans/participants` | PostgreSQL (приложение) |
| Отпуска (доступность) | `/quarterly-plans/availability/vacations` | PostgreSQL (приложение) |
| Цели спринта | `/sprint-goals`, `/sprint-goals/[id]` | PostgreSQL (приложение) |
| Фичи, документы, диаграммы, груминг (deprecated) | `/features`, `/features/[featureId]/**` | PostgreSQL (приложение) |
| Типы документов | `/document-types` | PostgreSQL (приложение) |
| Черновики | `/drafts` | PostgreSQL (приложение) |
| Прокси метаданных трекера | `/tracker` | Tracker + PostgreSQL (`occupancy_task_order`, `staff` для аватаров, команда по `boardId`) + tenant |
| Экраны, очереди, поля | `/screens/*`, `/queues/*`, `/fields/*` | Tracker |
| Текущий пользователь (трекер) | `/auth/myself` | Tracker; опционально `staff` (аватар, birthdate) при `x-organization-id` и членстве |
| Проверка OAuth-токена | `/auth/validate-token` | Tracker (`createTrackerApiClient`) |
| Участники команд | `/teams/members`, `/teams/members/search` | PostgreSQL `teams` / `staff` / `team_members` + tenant |
| Сотрудники реестра | `/users/search`, `/users/[trackerId]` | PostgreSQL `staff` + tenant |
| Праздники (прокси) | `/holidays/isdayoff` | Внешний HTTP (isdayoff.ru) |
| Загрузка файлов | `/files/upload` | Локальная ФС |
| Картинка диаграммы | `/features/[featureId]/diagrams/[diagramId]/image` | Локальная ФС |

## Как проверить при изменениях

В корне репозитория:

- Tracker: `rg "getTrackerApiFromRequest" app/api`
- Снимки в маршрутах: `rg "lib/snapshots|issue_snapshots" app/api`
- PostgreSQL приложения: `rg "from '@/lib/db'" app/api`
- Нормализация changelog для burndown/UI: `lib/ytrackerRawIssues.ts`

Число файлов `route.ts` может расти: при добавлении маршрута обновите эту таблицу или соответствующую строку.

## См. также

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — правила клиента и сервера
- [findings-api.md](../.spec-workflow/specs/check-architecture-problems/findings-api.md) — заметки аудита API (A6)
