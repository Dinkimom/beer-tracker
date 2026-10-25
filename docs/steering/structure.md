# Structure steering — Beer Tracker

Цель: быстро понять **куда класть код** и **где искать** уже существующие паттерны. Детальная карта — в [STRUCTURE.md](../STRUCTURE.md).

## Корень репозитория

| Путь | Назначение |
|------|------------|
| `app/` | Next.js App Router: страницы, layouts, **API routes** (`app/api/`) |
| `apps/` | Отдельные процессы: `sync-worker/`, `agent-bridge/`, `mcp-sprint-context/` |
| `features/` | Доменные модули (основной UI-код продукта) |
| `components/` | Переиспользуемые UI-компоненты вне одной фичи |
| `hooks/` | Общие хуки |
| `lib/` | Домены сервера (repositories, SQL), клиент `lib/api/*`, MobX (`lib/layers/`), чистые функции |
| `contexts/` | React-контексты |
| `constants/`, `types/`, `utils/` | Общие константы, TS-типы, утилиты |
| `database/` | `migrations/` — схема (применяются при старте), `legacy/` — разовые переносы данных |
| `scripts/` | CLI-скрипты (i18n, release, knip, eslint, bench) |
| `docs/` | Документация, в т.ч. **steering** (`docs/steering/`) |
| `public/` | Статика, PWA |

## Основные фичи (`features/`)

| Домен | Роль |
|-------|------|
| `sprint/` | Планер спринта (`SprintPlanner`), селектор, финиш спринта, цели, доступность |
| `swimlane/` | Свимлейн: дорожки, слои, стрелки, таймлайн факта, чат агента |
| `task/` | Карточки, панель задачи, хуки загрузки/мутаций/ресайза |
| `sidebar/` | Боковая панель планера и её вкладки |
| `comments/` | Заметки на свимлейне (WYSIWYG, реакции, диаграммы) |
| `backlog/` | Вкладка бэклога |
| `burndown/`, `retro/`, `sprint-metrics/` | Вкладки «Диаграмма сгорания», «Ретро», «Метрики» |
| `context-menu/`, `notifications/`, `board/`, `account/`, `qa/`, `admin/` | Меню карточки, уведомления, выбор доски, учёт работ, QA-логика, админка |

Добавляя возможность, **расширяйте существующую фичу** или заводите новую папку по тому же шаблону: `components/`, `hooks/`, `utils/`. SQL и оркестрация роутов — только в `lib/<domain>/`.

## API

- Маршруты: `app/api/**/route.ts` — тонкий HTTP-слой, без SQL.
- Клиентские обёртки: `lib/api/*` через `getPlannerBeerTrackerApi` (`lib/beerTrackerApi.ts` — реэкспорт `lib/api`).

## Точки входа планера

- Контейнер: `features/sprint/components/SprintPlanner.tsx` → `features/sprint/components/SprintPlanner/SprintPlannerView.tsx` (и соседние папки `board/`, `kanban/`, `feature-lanes/`, `components/`).
- Свимлейн: `features/swimlane/`, карточка — `features/task/components/TaskBar/`.
- Общие хелперы DnD: `features/sprint/components/SprintPlanner/sprintPlannerDndHelpers.ts` (не плодить копии логики в хуках/оболочках).

## Документация

- Индекс: [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md).
- Архитектура данных: [ARCHITECTURE.md](../../ARCHITECTURE.md) в корне.
- Правила для агентов и CI: [AGENTS.md](../../AGENTS.md).
