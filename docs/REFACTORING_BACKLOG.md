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

1. **Карточка: срезы вместо плоских пропсов.** `TaskBarOpacityLayer` переведён на срезы `card` / `chrome` / `longHover` (2026-11-21, было 54 поля и 70% проброса). `TaskBarProps` 45 → 37 (2026-11-21): разработчики, фильтр и спринт — из `SwimlaneBoardContext`, меню — подпиской, заметки — срезом `commentActions`, мёртвый `selectedTaskId` убран. Дальше 37 → 36: дубль `swimlaneBarDurationParts` (всегда равен `duration`) убран; сборщик меню быстрого добавления берёт срез `quickAdd` целиком вместо 16 полей, `TaskBar` отдаёт меню `{...quickAddMenu}` вместо 30 атрибутов — проброс `TaskBar` ниже порога. Осталось: геометрия сегмента (`swimlaneSegmentBadge`, `swimlaneSegmentSecondary`, `swimlaneTimelineTotalParts`, `planSegmentIndex`) — одним срезом; `TaskCardProps` (30).
2. ~~**Черновики быстрого добавления — таблица по виду.**~~ Сверено 2026-11-21: `submitQuickAdd{Comment,Diagram,Image}Draft` — не копии, у каждого вида своё поведение (правка сохранённой заметки и анимации; API и редактор схемы; сжатие фото и работа вне спринта). Общий скелет — 3–4 строки, хелпер не нужен. Настоящей проблемой был плоский интерфейс механизма — закрыт срезом `quickAdd` (п. 3).
3. **View model доски по срезам.** Было 103 поля у `SprintPlannerView`, сейчас 77. Сделано (2026-11-21):
   - `quickAdd` (`QuickAddController`) — 20 полей быстрого добавления одним объектом от `useSprintPlannerQuickAddDraft` до сегмента карточки;
   - цели — сайдбар сам читает `useSprintGoalsSummary` (кэш React Query), 8 полей ушли из десяти слоёв;
   - `commentActions` (`SwimlaneCommentActions`, `useSwimlaneCommentActions`) — минус 4–6 полей в интерфейсах дорожек;
   - окна (`ModalsSection`) берут `handlers` целиком;
   - дорожка: общее для всех дорожек (конфигурация, данные доски, обработчики) — в `SwimlaneBoardContext`, пропсами только своё и переходное. `SwimlaneProps` 48 → 23, `TaskLayerProps` 47 → 27; сборщик пропсов дорожки на 60 полей и свой компаратор `React.memo` (игнорировал конфиг и обработчики) удалены.

   Дальше — по касанию, отдача у каждого следующего среза ниже: drag (~4 поля), настройки отображения (6–7 полей; не читать из localStorage в листьях — `commentsVisible` вычисляется, дорожки фич отключают факт-таймлайн), раскладка. Цель — до 15 пропсов у `SprintPlannerView`.

### 2.7 Производительность доски (высокий)

Замер — демо, dev, счётчики рендеров во временных пробах (`console.warn` в `SprintPlannerView`, `Swimlane`, `TaskBar`) и сценарий Playwright: простой 2 с, движение мыши внутри карточки, 12 наведений на карточки. После правки — тот же сценарий до и после.

1. ~~**Доска перерисовывала себя в простое.**~~ Исправлено 2026-11-21 (`useLatestCallback` для `useXarrow` во view model): петля «рендер → эффект → `updateXarrow` → рендер» давала ~7 перерисовок всей доски в секунду. Простой 2 с: доска / дорожки / карточки 14 / 84 / 168 → 0.
2. ~~**Наведение перерисовывало все дорожки и карточки.**~~ Исправлено 2026-11-21. Подсветка (наведение, кластер связей, факт, контекстное меню) идёт подпиской `SwimlaneHighlightProvider` мимо пропсов: карточка выбирает селектором своё (`useSwimlaneHighlightSelector`, `useSwimlaneCardContextMenu`), флаг наведения в `TaskBar` — `computed` MobX вместо чтения `hoveredTaskId` в рендере. 12 наведений: дорожки / карточки 96 / 372 → 0 / 86 (перерисовываются только карточки, у которых сменилось приглушение).
3. **Объекты, которые `SprintPlannerView` пересоздаёт на каждом рендере** (`assigneeOptions={{…}}`, `movePlacement`, `handlers` — новый объект от `useSprintPlannerHandlers`). Сейчас безвредно: доска без причины не рендерится. Станет важно, если секции начнут получать их целиком и рендериться чаще.

---

## 3. Не дублировать здесь

Правила слоёв, gate (`typecheck` / `lint` / `lint:unused` / `test`), консолидация `*Helpers*` — только в [`AGENTS.md`](../AGENTS.md) и [`ARCHITECTURE_UNIFORMITY.md`](./ARCHITECTURE_UNIFORMITY.md).

**Последнее обновление:** 2026-10-25
