# Tech steering — Beer Tracker

## Стек

| Слой | Технологии |
|------|------------|
| UI | Next.js 16 (App Router), React 19, TypeScript |
| Стили | Tailwind CSS 4 |
| Сервер | Next.js API Routes |
| Клиентский кэш | TanStack React Query 5 (+ persist при необходимости) |
| Доменное UI-состояние планера | MobX 6: `lib/layers/application/mobx/stores/`; позиции в планере — [`useTaskPositionsApi`](../../hooks/useTaskPositionsApi.ts) |
| DnD | dnd-kit |
| HTTP | Axios (`lib/axios.ts` — инстансы с заголовками трекера) |
| Валидация | Zod 4 |
| Редакторы | Tiptap (заметки, описание задачи), Excalidraw (диаграммы) |
| Тесты / качество | Vitest, ESLint, Knip, Storybook |
| СУБД | PostgreSQL (`pg`) — приложение, снимки задач (`issue_snapshots`), мультиарендность |
| Очередь sync (опционально) | Redis + BullMQ (`REDIS_URL`, `pnpm sync-worker` → `apps/sync-worker/`) |
| Realtime | SSE-канал спринта (`lib/realtime/`) |
| Агент | MCP (`@modelcontextprotocol/sdk`): удалённый `/api/mcp` с OAuth 2.1 (`lib/mcp/`) |
| Файлы (опционально) | S3-совместимое хранилище (`lib/storage/`) |

## Внешние системы

- **Issue tracker API** (**Yandex Tracker** или **Jira**, выбор на организацию) — источник правды по задачам, спринтам, доскам; изменения через API и прокси-роуты приложения. См. [ISSUE_TRACKERS.md](../ISSUE_TRACKERS.md).
- **PostgreSQL** — чтение снимков задач (бэклог, burndown, карточка задачи и т.д.), staff/teams, данные планера.
- **MCP-клиенты** (claude.ai, Cursor, локальный `apps/agent-bridge/`) — читают контекст спринта и предлагают план; запись только через `propose_plan_patch` → `apply_plan_patch`. См. [SPRINT_CONTEXT.md](../SPRINT_CONTEXT.md).

## Аутентификация к трекеру

- Получение токена: Yandex ID OAuth (`app/api/auth/yandex/`), Atlassian OAuth для Jira Cloud (`app/api/auth/atlassian/`), Jira PAT / API token вручную.
- Пользовательский токен хранится в **localStorage**, в запросы уходит заголовок **`X-Tracker-Token`** (для Jira Cloud OAuth — дополнительно `X-Tracker-Cloud-Id`).
- Валидация: API `POST /api/auth/validate-token` (нужны сессия продукта и организация: заголовок `X-Organization-Id` или `organizationId` в теле), клиентский хелпер `validateToken`.
- Защита маршрутов: `AuthGuard` → редирект на `/auth-setup` без токена.
- Токен организации для синхронизации хранится в БД в зашифрованном виде (админка «Трекер»), не в env.

## Архитектура состояния (кратко)

Полная карта: **[ARCHITECTURE.md](../../ARCHITECTURE.md)**.

- **React Query** — списки задач спринта, спринты, доски; оптимистичные правки через `patchSprintTasksQuery` (`features/task/hooks/useTasks.ts`, патчит все кэши задач спринта той же доски).
- **MobX** — позиции карточек ([`useTaskPositionsApi`](../../hooks/useTaskPositionsApi.ts) → `TaskPositionsStore`), поколения ответов, debounce сохранений; `SprintPlannerUiStore` для преходящего UI планера.
- **Локальный стейт + debounce** — связи задач, комментарии (`useDebouncedApiSync` и родственные хуки).
- **`lib/`** — геометрия, парсеры, чистые функции без React/MobX; покрытие unit-тестами.

## Команды качества (обязательны перед merge)

Из [AGENTS.md](../../AGENTS.md):

- `pnpm typecheck`
- `pnpm lint` (`--max-warnings 0`)
- `pnpm test` (Vitest + `pnpm check:i18n`)
- `pnpm lint:unused` (Knip)

## Конвенции

- Feature-first: новая функциональность в `features/<domain>/` (компоненты, хуки, утилиты рядом).
- Не дублировать маршрутизацию DnD планера — `features/sprint/components/SprintPlanner/sprintPlannerDndHelpers.ts`.
- UI основного планера — `SprintPlannerUiStore` и свимлейн.
- SQL — только в `lib/<domain>/*Repository.ts`; `app/api/**` без прямого доступа к БД (ESLint `api/no-direct-db`).
- ESLint: политика в `eslint.config.mjs` (Sonar/React Compiler — см. комментарии в файле).

## CI

- GitHub Actions (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- Образы Docker Hub собираются по тегу релиза (`.github/workflows/docker-hub.yml`).
