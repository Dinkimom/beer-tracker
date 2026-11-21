# Бэклог рефакторинга

Онбординг и планирование UI/качества. **Слои HTTP/БД** (UI → `lib/api` → `route` → `lib/<domain>`) зафиксированы и закрыты — см. [`ARCHITECTURE_UNIFORMITY.md`](./ARCHITECTURE_UNIFORMITY.md) и схему в [`ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 1. Сделано (архитектура и клиентский API)

| Тема | Где |
|------|-----|
| SQL вне `app/api`, repositories в `lib/<domain>` | `AGENTS.md`, ESLint `api/no-direct-db` |
| DTO score и клиентский `lib/api/*` (в т.ч. features, admin) | `lib/api/`, `lib/api/types.ts` |
| `lib` без `@/features` | ESLint `layers/no-features-import` |
| Route helpers вне `app/api` | `lib/admin`, `lib/issues`, `lib/auth`, … |
| Клиентский API в модулях | `lib/api/*.ts`; баррель `lib/beerTrackerApi.ts` → `export * from './api'` |
| Tracker API на сервере | `lib/trackerApi/`; новый код — `lib/issueTrackerProvider` |
| ClickHouse → snapshots | `lib/snapshots/*` |

Баррель (`lib/api/index.ts`) реэкспортирует часть модулей: `auth`, `admin`, `analytics`, `boards`, `boardAvailability`, `calendar`, `features`, `holidays`, `issues`, `linkPreview`, `notifications`, `onprem`, `organizations`, `plannerIntegrationRules`, `queues`, `readApiError`, `realtime`, `sprintGoals`, `sprints`, `types`. Остальные (`sprintMetrics`, `plannerTimeline`, `retroColumnTemplate`, `agentSessions`, …) в баррель не входят; на практике UI чаще импортирует модуль напрямую (`@/lib/api/issues`, `@/lib/api/sprints`).

Новый клиентский модуль: файл в `lib/api/`, вызов через `getPlannerBeerTrackerApi()` (`lib/plannerBeerTrackerApiOverride.ts`) — без raw `beerTrackerApi` в UI.

---

## 2. Открытый долг (UI / DX)

### 2.1 Ошибки на клиенте (средний)

Единый toast / обработчик для React Query и мутаций (в `components/QueryProvider.tsx` глобального `onError` нет); меньше «тихих» `console.error` без UI (на 2026-10-25 ~100 вхождений в `features/`, `components/`, `hooks/`, `contexts/`).

### 2.2 Shared UI (средний)

Аудит: [`SHARED_COMPONENTS_AUDIT.md`](./SHARED_COMPONENTS_AUDIT.md). `SearchInput`, `StatusTag`, `Input`/`TextArea`, `Button`, `CustomSelect` внедрены; `PointBadge` / `TeamTag` удалены как мёртвый код — открыт только вопрос общего бейджа SP/TP и тега команды.

### 2.3 ESLint-disable (низкий–средний)

- `react-hooks/exhaustive-deps` — пересмотреть зависимости или вынести логику (5 `eslint-disable` на 2026-10-25).
- `react-hooks/set-state-in-effect` — где возможно, без setState в эффекте (4 `eslint-disable`).
- ~~`no-await-in-loop`~~ — правило выключено глобально в `eslint.config.mjs` (последовательные вызовы допускаются), локальных disable нет.

### 2.4 Мелочи (низкий)

Общие мапперы задач/позиций; type guards в `lib/api-error-handler.ts`; именованные константы статусов / `batchSize`.

### 2.5 Пролог роутов спринта (низкий–средний)

~24 роута `app/api/sprints/[sprintId]/**` начинаются одинаково: сигнатура с `params`, `requireSprintRouteContext`, ранний `return tenantResult.response`, `organizationId` / `sprintId`. jscpd считает это клонами, и каждый новый роут спринта (или правка старого) даёт «новый» клон — baseline обновлялся 2026-11-21 дважды (`positions/clear`, `history`). Обёртка вида `withSprintRoute(handler)` с `{ ctx, sprintId, request }` убрала бы клоны и шаблон. (2026-11-21)

### 2.6 Форма доски (высокий, по шагу в спринт)

Доску дорого менять из-за широких интерфейсов и слоёв-пробросов, а не из-за длины файлов (замер 2026-11-21, `pnpm quality:report`; правила — `AGENTS.md`, «Форма кода»). Каждый шаг — отдельный коммит с `pnpm e2e` и `pnpm e2e:visual`, результат — меньше записей в `.shape-baseline.json`.

**Уточнить метрику проброса.** `lint:shape` считает пробросом только `x={x}`, а пересылка из среза `x={handlers.x}` — тоже проброс. Из-за этого удаление таких атрибутов поднимает долю: `SprintPlannerView` после среза `handlers` для `ModalsSection` стал 51% (было 49%) при том же числе пробросов. Считать пробросом значение-идентификатор и доступ к полю без вычислений, baseline переснять отдельным коммитом.

1. **Карточка: срезы вместо плоских пропсов.** `TaskBarOpacityLayer` переведён на срезы `card` / `chrome` / `longHover` (2026-11-21, было 54 поля и 70% проброса). Осталось: `TaskBarProps` (45) и `TaskCardProps` (30) — тот же приём, срез держит связанные поля вместе.
2. ~~**Черновики быстрого добавления — таблица по виду.**~~ Сверено 2026-11-21: `submitQuickAdd{Comment,Diagram,Image}Draft` — не копии, у каждого вида своё поведение (правка сохранённой заметки и анимации; API и редактор схемы; сжатие фото и работа вне спринта). Общий скелет — 3–4 строки, хелпер не нужен. Настоящей проблемой был плоский интерфейс механизма — закрыт срезом `quickAdd` (п. 3).
3. **View model доски по срезам.** Было 103 поля у `SprintPlannerView`, проброс в `SidebarSection` и `ModalsSection`. Сделано (2026-11-21): срез `quickAdd` (`QuickAddController`) — 20 полей быстрого добавления одним объектом от `useSprintPlannerQuickAddDraft` до сегмента карточки, минус 20 полей в шести интерфейсах; срез целей — сайдбар сам читает `useSprintGoalsSummary` (кэш React Query), 8 полей ушли из десяти слоёв от страницы до сайдбара; `SprintPlannerView` — 77 полей. Дальше по тому же образцу: заметки (`onComment*`), drag, раскладка, окна (`ModalsSection`). Цель — до 15 пропсов у `SprintPlannerView`.

---

## 3. Не дублировать здесь

Правила слоёв, gate (`typecheck` / `lint` / `lint:unused` / `test`), консолидация `*Helpers*` — только в [`AGENTS.md`](../AGENTS.md) и [`ARCHITECTURE_UNIFORMITY.md`](./ARCHITECTURE_UNIFORMITY.md).

**Последнее обновление:** 2026-10-25
