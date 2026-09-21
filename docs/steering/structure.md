# Structure steering — Beer Tracker

Цель: быстро понять **куда класть код** и **где искать** уже существующие паттерны. Детальное дерево файлов — в [STRUCTURE.md](../STRUCTURE.md).

## Корень репозитория

| Путь | Назначение |
|------|------------|
| `app/` | Next.js App Router: страницы, layouts, **API routes** (`app/api/`) |
| `features/` | Доменные модули (основной код продукта) |
| `components/` | Переиспользуемые UI-компоненты вне одной фичи |
| `hooks/` | Общие хуки |
| `lib/` | Клиенты API, env, геометрия, валидация, слой application/mobx |
| `contexts/` | React-контексты |
| `types/` | Общие TS-типы |
| `database/` | SQL и миграции PostgreSQL |
| `docs/` | Документация, в т.ч. **steering** (`docs/steering/`) |
| `public/` | Статика |

## Основные фичи (`features/`)

| Домен | Роль |
|-------|------|
| `sprint/` | Спринт: планер, модалки старта/финиша, цели, селектор |
| `task/` | Задачи: карточки, таймлайн, хуки загрузки/мутаций, TaskService |
| `swimlane/` | Свимлейны, дроп-зоны, стрелки/линки |
| `sidebar/` | Боковая панель планера, вкладки задач/бэклога/целей |
| `backlog/` | Страница и логика бэклога |
| `burndown/` | Burndown |
| `feature-planner/` | Планировщик фич (**deprecated**, не развивать) |
| `quarterly-planning-v2/` | Квартальный план (**deprecated**, не развивать) |
| `board/` | Выбор доски |
| `developers/` | Управление разработчиками в UI |
| `qa/` | QA-утилиты (статусы, размещение) |

Добавляя возможность, **расширяйте существующую фичу** или заводите новую папку по тому же шаблону: `components/`, `hooks/`, `utils/` (и `services/` при необходимости).

## API

- Маршруты: `app/api/**/route.ts`.
- Клиентские обёртки: `lib/beerTrackerApi.ts`, `lib/api/*`, вызовы через настроенный axios.

## Точки входа планера

- Главный контейнер: `features/sprint/components/SprintPlanner/SprintPlanner.tsx` (и соседние файлы).
- Общие хелперы DnD: `sprintPlannerDndHelpers.ts` (не плодить копии логики в хуках/оболочках).

## Документация

- Индекс: [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) / [README.md](../README.md).
- Архитектура данных: [ARCHITECTURE.md](../../ARCHITECTURE.md) в корне.
- Правила для агентов и CI: [AGENTS.md](../../AGENTS.md).
