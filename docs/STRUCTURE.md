# Структура проекта Beer Tracker

## 📁 Feature-based архитектура

Проект организован по **domain-driven** принципу: продуктовый UI-код лежит в `features/<домен>/` вместе с хуками и утилитами, серверная логика и чистые функции — в `lib/<домен>/`, HTTP-слой — в `app/api/`.

Правила слоёв, лимиты сложности и политика `*Helpers*` — в [AGENTS.md](../AGENTS.md); карта состояния — в [ARCHITECTURE.md](../ARCHITECTURE.md).

## 📂 Корень репозитория

```
beer-tracker/
├── app/                  # Next.js App Router
│   ├── (main)/           # Главная и планер: /, /planner/[boardId]/sprint/[sprintId]
│   ├── admin/            # Админка: org, teams, members, tracker, roles, sync, planner, retro
│   ├── api/              # API routes (тонкий HTTP-слой, без SQL)
│   ├── demo/planner/     # Демо планера на фикстурах (lib/demo/)
│   ├── mcp/oauth/consent/# Экран согласия OAuth для MCP-клиентов
│   ├── auth-setup/  login/  register/  select-board/
│   └── layout.tsx, globals.css, ThemeProvider.tsx
├── apps/                 # Отдельные процессы вне Next.js
│   ├── sync-worker/      # BullMQ-воркер синхронизации (pnpm sync-worker)
│   ├── agent-bridge/     # Локальный мост планер → Claude CLI (pnpm agent-bridge)
│   └── mcp-sprint-context/ # stdio-клиент MCP для отладки (pnpm mcp:sprint-context)
├── features/             # Продуктовые домены (UI + хуки + утилиты)
├── components/           # Общие UI-примитивы (Button, Icon, PageHeader, SettingsModal/…)
├── hooks/                # Общие хуки (useTaskPositionsApi, useDebouncedApiSync, localStorage/…)
├── contexts/             # React-контексты (язык, провайдер трекера, демо-оболочка и т.п.)
├── lib/                  # Домены сервера и клиента, API-клиенты, чистые функции
├── constants/            # index.ts, zIndex.ts
├── types/                # index.ts, tracker.ts, team.ts, quarterly.ts
├── utils/                # Общие утилиты (даты, статусы, переводы, plannerClock)
├── database/             # init.sql и плоские миграции database/*.sql
├── scripts/              # bench, ci, db, eslint, i18n, knip, release
├── docs/                 # Документация (в т.ч. docs/steering/)
└── public/               # Статика, PWA (sw.js, offline.html), демо-ассеты
```

Миграции лежат прямо в `database/` (например `database/add-swimlane-card-layers.sql`), отдельной папки `migrations/` нет. Многие новые таблицы и колонки создаются приложением автоматически при первом обращении; миграционный файл нужен для ручной установки (см. [CHANGELOG.md](../CHANGELOG.md)).

## 🧩 `features/`

| Домен | Что внутри |
|-------|------------|
| `sprint/` | Планер спринта: `components/SprintPlanner.tsx` → `SprintPlanner/` (`SprintPlannerView.tsx`, `board/`, `kanban/`, `feature-lanes/`, `components/` — тулбары, чат агента, таймер; `sprintPlannerDndHelpers.ts`), селектор спринта, модалка финиша, цели, учёт работ, доступность |
| `swimlane/` | Свимлейн: дорожки, ячейки, слои, стрелки связей (`task-arrows/`), таймлайн факта (`in-progress-fact/`), чипы доступности, занятость календаря, превью плана агента |
| `task/` | Карточки задач: `TaskCard/`, `TaskBar/`, `DraggableTask/`, `TaskTimeline/`, `TaskInfoSidebar/`; хуки `useTasks`, мутации, ресайз |
| `sidebar/` | Сайдбар спринта и вкладки `components/tabs/` (задачи, невалидные, цели, дейли, метрики, бэклог, баги) |
| `comments/` | Заметки (стикеры) на свимлейне: WYSIWYG-редактор, реакции, диаграммы Excalidraw |
| `backlog/` | Вкладка «Бэклог»: колонки спринтов, фильтры, массовый перенос |
| `burndown/` | Вкладка «Диаграмма сгорания» |
| `retro/` | Вкладка «Ретро»: доска ретроспективы и факты спринта |
| `sprint-metrics/` | Вкладка «Метрики»: дашборд доски по кварталу |
| `sla-bugs/` | Хуки вкладки «Баги» (UI — `features/sidebar/components/tabs/BugsTab/`) |
| `context-menu/` | Контекстное меню карточки и сабменю |
| `notifications/` | Колокольчик и панель уведомлений |
| `board/` | Выбор доски, параметры доски |
| `admin/` | UI админки (org, teams, members, roles, tracker, planner, retro, sync) |
| `account/` | Модалка учёта работ |
| `qa/` | QA-логика (маппинг статусов, размещение QA-задач) |
| `markdown/` | Превью чеклистов из markdown |
| `widgets/` | Виджеты на свимлейне (крестики-нолики) |
| `planner/` | `PlannerTimelineScaleProvider.tsx` |

## 📚 `lib/` (основные домены)

| Путь | Назначение |
|------|------------|
| `lib/api/` | Клиентский фасад к `/api/*` (`getPlannerBeerTrackerApi`), DTO |
| `lib/layers/` | MobX-сторы (`application/mobx/stores/`), репозитории и мапперы данных |
| `lib/issueTrackerProvider/`, `lib/trackerApi/`, `lib/tracker/` | Абстракция провайдера (Yandex Tracker / Jira) и клиенты трекера |
| `lib/sprints/`, `lib/sprintGoals/`, `lib/sprintMetrics/`, `lib/burndown/` | Позиции, связи, слои, превью плана, цели, метрики, burndown |
| `lib/comments/`, `lib/retro/` | Заметки планера, доска ретро и шаблоны колонок |
| `lib/agentSessions/`, `lib/mcp/` | Сессии агента и MCP-сервер (`/api/mcp`, OAuth в `lib/mcp/oauth/`) |
| `lib/snapshots/`, `lib/sync/` | Снимки задач (`issue_snapshots`) и синхронизация (BullMQ) |
| `lib/realtime/` | SSE-канал спринта, присутствие, таймер |
| `lib/organizations/`, `lib/staffTeams/`, `lib/admin/`, `lib/roles/`, `lib/access/`, `lib/auth/` | Мультиарендность, команды, админка, роли, сессии |
| `lib/calendar/`, `lib/holidays/` | CalDAV-занятость, производственный календарь |
| `lib/slaBugs/`, `lib/overseer/` | SLA-баги и данные обращений HD |
| `lib/notifications/`, `lib/storage/` | Уведомления, объектное хранилище (S3) |
| `lib/boardAvailability/` | События доступности доски (отпуска, техспринты, больничные, дежурства) |
| `lib/i18n/` | Словари ru/en (`lib/i18n/messages/`) |
| `lib/demo/` | Фикстуры `/demo/planner` |
| `lib/db.ts` | Пул PostgreSQL (импорт из `app/api/**` запрещён ESLint) |

## 🎨 Принципы организации

### 1. Feature-first

```
features/<домен>/
├── components/   # UI этого домена
├── hooks/        # хуки этого домена
└── utils/        # утилиты этого домена
```

SQL и оркестрация роутов — только в `lib/<домен>/`, не в `features/` и не рядом с `route.ts`.

### 2. Shared — только общее

В `components/`, `hooks/`, `utils/` попадает то, что используется в 2+ доменах. Перед новым UI-атомом — поиск в `components/` (см. раздел «Дизайн-система» в AGENTS.md).

### 3. Импорты

```typescript
// Между модулями — абсолютный путь через @/
import { useTasks } from '@/features/task/hooks/useTasks';
import { Icon } from '@/components/Icon';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Внутри одного модуля допустимы относительные импорты
import { SprintPlannerView } from './SprintPlanner/SprintPlannerView';
```

UI и `lib/` не импортируют из `@/app/api/**`; клиент ходит в API только через `lib/api/*`.

### 4. Страница = композиция фич

- **`features/`** — домены (кирпичики).
- **`app/`** — маршруты и композиция. Например, `app/(main)/MainPageClientSprintsContent.tsx` подключает планер, бэклог, burndown, ретро и метрики по `?tab=`.

Новый домен в `features/` заводится, если это самостоятельная бизнес-сущность или код переиспользуется на нескольких страницах.

## ✅ Проверки

Перед сдачей задачи (см. [AGENTS.md](../AGENTS.md)):

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm lint:unused
```

---

**Последнее обновление**: октябрь 2026 (v1.24.0)
