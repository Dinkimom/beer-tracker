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
| Тесты | Vitest |
| СУБД | PostgreSQL (`pg`) — приложение, снимки задач (`issue_snapshots`), мультиарендность |
| Очередь sync (опционально) | Redis + BullMQ (`REDIS_URL`, `pnpm sync-worker`) |

## Внешние системы

- **Yandex Tracker API** — источник правды по задачам, спринтам, доскам; изменения через API и прокси-роуты приложения.
- **PostgreSQL** — чтение снимков задач (бэклог, эпики, стори и т.д.), staff/teams, данные планера.

## Аутентификация к трекеру

- Пользовательский токен хранится в **localStorage** (`beer-tracker-tracker-token`), в запросы уходит заголовок **`X-Tracker-Token`**.
- Валидация: API `POST /api/auth/validate-token` (нужны сессия продукта и организация: заголовок `X-Organization-Id` или `organizationId` в теле), клиентский хелпер `validateToken`.
- Защита маршрутов: `AuthGuard` → редирект на `/auth-setup` без токена.
- Опционально серверный `TRACKER_OAUTH_TOKEN` в `.env` как fallback (см. README).

## Архитектура состояния (кратко)

Полная карта: **[ARCHITECTURE.md](../../ARCHITECTURE.md)**.

- **React Query** — списки задач спринта, спринты, доски; оптимистичные правки через `patchSprintTasksQuery` (основной ключ `useTasks` и occupancy-снимки той же доски).
- **MobX** — позиции карточек ([`useTaskPositionsApi`](../../hooks/useTaskPositionsApi.ts) → `TaskPositionsStore`), поколения ответов, debounce сохранений; `SprintPlannerUiStore` для преходящего UI планера.
- **Локальный стейт + debounce** — связи задач, комментарии, порядок занятости (`useDebouncedApiSync` и родственные хуки).
- **`lib/`** — геометрия, парсеры, чистые функции без React/MobX; покрытие unit-тестами.

## Команды качества (обязательны перед merge)

Из [AGENTS.md](../../AGENTS.md):

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

## Конвенции

- Feature-first: новая функциональность в `features/<domain>/` (компоненты, хуки, утилиты рядом).
- Не дублировать маршрутизацию DnD планера — `features/sprint/components/SprintPlanner/sprintPlannerDndHelpers.ts`.
- Разрешение UI планера/пропсов: `occupancyPlannerUiResolve.ts` (есть тесты).
- ESLint: политика в `eslint.config.mjs` (Sonar/React Compiler — см. комментарии в файле).

## CI

- GitHub Actions (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm typecheck`, `pnpm test`.
