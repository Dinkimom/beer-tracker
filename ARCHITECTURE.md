# Архитектура данных и состояния

Краткая карта: **где что живёт** и **как связаны** HTTP-слои, React Query, MobX и локальный стейт. Цель — быстрее ориентироваться при правках планера и API.

## HTTP: UI → клиент → route → domain

```text
features/ / components/ / hooks/
        │
        ▼  только lib/api/*  (getPlannerBeerTrackerApi)
   lib/api/*                 клиентский фасад + DTO (`lib/api/types`, lib/<domain>)
        │
        ▼  HTTP /api/...
   app/api/**/route.ts       тонкий: tenant/auth, Zod, status, cache invalidate
        │
        ▼
   lib/<domain>/             repositories (SQL), *RouteHelpers (оркестрация)
```

| Слой | Ответственность | Примеры |
|------|-----------------|---------|
| UI | React, хуки, сторы; без raw `fetch('/api/...')` и без импортов из `app/api` | `features/sprint/...` |
| `lib/api/*` | axios → backend; публичные типы ответов | `lib/api/sprints.ts`, `lib/api/admin/` |
| `app/api/**/route.ts` | HTTP-контракт; **без SQL** (`api/no-direct-db`) | `app/api/sprints/.../route.ts` |
| `lib/<domain>` | SQL, транзакции, оркестрация для routes | `lib/sprints/`, `lib/admin/`, `lib/features/` |

**ESLint:** `api/no-direct-db`, `layers/no-app-api-import`, `layers/no-features-import` (`lib` ↛ `features`). Правила и чеклисты волн: [`docs/ARCHITECTURE_UNIFORMITY.md`](./docs/ARCHITECTURE_UNIFORMITY.md), краткие нормы — [`AGENTS.md`](./AGENTS.md).

**Tracker:** новый серверный код провайдера — `lib/issueTrackerProvider`; `lib/trackerApi` — легаси, трогать по касанию.

## React Query (серверный кэш)

| Данные | Ключ / хук | Примечание |
|--------|------------|------------|
| Задачи спринта (основной список) | `sprintTasksQueryKey` → `['tasks', sprintId, boardId]` | `useTasks` на странице и в `useSprintPlannerState` (один кэш), полный ответ — `useReloadTasks`; оптимистичные правки списка — `patchSprintTasksQuery` |
| Задачи для вкладки «Занятость» с фильтром по статусу | `['tasks', 'occupancy', sprintId, boardId, statusFilter]` | `useOccupancyTasks` — отдельный запрос под фильтр |
| Списки спринтов по доске | `['sprints', boardId]` | `useSprints` и т.п. |
| Доски | см. `useBoards` | |

Источник правды по составу задач с трекера — **кэш Query**. Инвалидация и `setQueryData` должны использовать **тот же ключ**, что и `useTasks` (см. `sprintTasksQueryKey` в `features/task/hooks/useTasks.ts`).

### Два кэша списка задач: `useTasks` и `useOccupancyTasks`

**`useTasks`** держит основной ответ спринта (задачи и разработчики для доски, сайдбара и свимлейна). **`useOccupancyTasks`** — отдельные запросы с **другим ключом** React Query: на вкладке «Занятость» при фильтре по статусу («активные» / «завершённые» и т.д.) уходит свой `fetch`, поэтому в кэше лежит несколько снимков на пару спринт+доска (по одному на комбинацию с фильтром). Оптимистичные правки через `patchSprintTasksQuery`, `upsertSprintTaskInQueries` и `removeSprintTaskFromQueries` зеркалятся во все ключи той же пары спринт+доска; для occupancy после патча снова применяется фильтр статуса ключа. После **полной** подтяжки из трекера используйте [`useReloadTasks`](./features/task/hooks/useTaskMutations.ts): там обновляется кэш основного списка и **инвалидируется** префикс occupancy, чтобы отфильтрованные снимки перезапросились.

## MobX (`lib/layers/application/mobx/`)

Классы сторов: `lib/layers/application/mobx/stores/` (`TaskPositionsStore`, `SprintPlannerUiStore`); корневой стор: [`lib/layers/application/mobx/createRootStore.ts`](./lib/layers/application/mobx/createRootStore.ts).

| Стор | Назначение |
|------|------------|
| `TaskPositionsStore` | Позиции карточек на свимлейне/занятости: `observable.map<taskId, TaskPosition>`, загрузка `fetchSprintPositions`, debounce сохранений, поколения ответов чтобы устаревший `fetch` не затирал локальные правки после DnD |
| `SprintPlannerUiStore` | Преходящий UI планера: поиск, контекстное меню, hover, сегменты фаз, фокус комментария и т.д. |

Доступ к сторам: `useRootStore()` в клиентских компонентах. Для позиций в планере спринта типичен фасад [`useTaskPositionsApi`](./hooks/useTaskPositionsApi.ts) (внутри — тот же `TaskPositionsStore`).

## Локальный стейт + API (дебаунс сохранения)

Не MobX и не React Query: данные в React state, запись на сервер **с задержкой** после серии правок (см. `DELAYS.DEBOUNCE` в `utils/constants`).

### Когда что использовать

| Паттерн | Файл | Подходит для |
|---------|------|----------------|
| **`useDebouncedApiSync`** | [`hooks/useDebouncedApiSync.ts`](./hooks/useDebouncedApiSync.ts) | **Список сущностей** на спринт: загрузка массива, правки/создание/удаление по элементу, отложенный save (и опционально батч). |
| **`useOccupancyTaskOrderApi`** | [`hooks/useApiStorage.ts`](./hooks/useApiStorage.ts) | **Один JSON-документ** на спринт (`OccupancyTaskOrder`) — порядок строк во вкладке «Занятость». Целиком пересохраняется после дебаунса; не CRUD по элементам. |
| **`useFeatureLanesApi`** | [`hooks/useApiStorage.ts`](./hooks/useApiStorage.ts) | **Один JSON-документ** на спринт (`FeatureLanesDocument`) — черновые строки фич, порядок и скрытие. Целиком пересохраняется после дебаунса. |

Обёртки над `useDebouncedApiSync` в том же [`useApiStorage.ts`](./hooks/useApiStorage.ts):

| Данные | Хук |
|--------|-----|
| Связи задач (стрелки) | `useTaskLinksApi` |
| Комментарии на таймлайне | `useCommentsApi` |

`useOccupancyTaskOrderApi` и `useFeatureLanesApi` **не** строятся на `useDebouncedApiSync`: последний рассчитан на массивы, карту отложенных обновлений по id и операции save/delete **по элементу**. Порядок занятости и строки фич — монолитные JSON-документы; проще и прозрачнее отдельный `useState` + один таймер.

При гонках с сервером или необходимости шарить состояние шире, чем через пропсы планера — отдельное решение (например React Query или стор); обсуждать в команде.

## Задачи и разработчики в `SprintPlanner`, оптимистичные правки

1. **Один кэш:** и страница, и `useSprintPlannerState` вызывают `useTasks(sprintId, boardId)` с тем же ключом — React Query **не дублирует** запрос; в планере **`tasks` и `developers`** берутся только из `tasksQuery.data` (пропсы с страницы не передаются).

2. **Оптимистичные правки:** обработчики вызывают `setTasks`, который внутри дергает **`patchSprintTasksQuery`** — обновляется только массив `tasks` внутри объекта `TasksResponse` в кэше (`developers` и `sprintInfo` сохраняются).

3. **Полная перезагрузка:** `useReloadTasks` подменяет весь `TasksResponse` в кэше; подписчики `useTasks` получают новые данные.

## `OccupancyView` и стор UI

При `usePlannerUiStore: true` (только основной `SprintPlanner`) часть полей берётся из `SprintPlannerUiStore`; иначе — из пропсов. Единая логика: `occupancyPlannerUiResolve.ts` (есть unit-тесты).

## Чистые функции (`lib/`, хелперы планера)

Геометрия, мапперы в API, валидация занятости — без React/MobX; покрывать unit-тестами (Vitest). `lib/` не импортирует `@/features/**`.

## См. также

- Подсказки для CI и линтеров: [AGENTS.md](./AGENTS.md)
- Единообразие слоёв (P1–P4): [docs/ARCHITECTURE_UNIFORMITY.md](./docs/ARCHITECTURE_UNIFORMITY.md)
- UI-долг и shared components: [docs/REFACTORING_BACKLOG.md](./docs/REFACTORING_BACKLOG.md)
- MobX, dnd-kit, `lib/`: раздел «Слои» в [AGENTS.md](./AGENTS.md)
