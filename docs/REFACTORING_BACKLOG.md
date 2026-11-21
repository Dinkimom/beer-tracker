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

1. **Карточка: срезы вместо плоских пропсов.** `TaskBarOpacityLayer` переведён на срезы `card` / `chrome` / `longHover` (2026-11-21, было 54 поля и 70% проброса). `TaskBarProps` 45 → 37 (2026-11-21): разработчики, фильтр и спринт — из `SwimlaneBoardContext`, меню — подпиской, заметки — срезом `commentActions`, мёртвый `selectedTaskId` убран. Дальше 37 → 36: дубль `swimlaneBarDurationParts` (всегда равен `duration`) убран; сборщик меню быстрого добавления берёт срез `quickAdd` целиком вместо 16 полей, `TaskBar` отдаёт меню `{...quickAddMenu}` вместо 30 атрибутов — проброс `TaskBar` ниже порога. `TaskCardProps` 30 → 26 — убраны мёртвые пропсы релиза (проверки GitLab, бейдж спринта, «Опасность»: их никто не передавал), вместе с ними 2 компонента. Затем 36 → 31 (2026-11-21): клик, QA-задачи, перерисовка стрелок и длина спринта — из `useTaskBarBoard`; мёртвый `isSelected` убран. Осталось: геометрия отрезка (`swimlaneSegmentBadge`, `swimlaneSegmentSecondary`, `planSegmentIndex`) — одним срезом.
2. ~~**Черновики быстрого добавления — таблица по виду.**~~ Сверено 2026-11-21: `submitQuickAdd{Comment,Diagram,Image}Draft` — не копии, у каждого вида своё поведение (правка сохранённой заметки и анимации; API и редактор схемы; сжатие фото и работа вне спринта). Общий скелет — 3–4 строки, хелпер не нужен. Настоящей проблемой был плоский интерфейс механизма — закрыт срезом `quickAdd` (п. 3).
3. **View model доски по срезам.** Было 103 поля у `SprintPlannerView`, сейчас 77. Сделано (2026-11-21):
   - `quickAdd` (`QuickAddController`) — 20 полей быстрого добавления одним объектом от `useSprintPlannerQuickAddDraft` до сегмента карточки;
   - цели — сайдбар сам читает `useSprintGoalsSummary` (кэш React Query), 8 полей ушли из десяти слоёв;
   - `commentActions` (`SwimlaneCommentActions`, `useSwimlaneCommentActions`) — минус 4–6 полей в интерфейсах дорожек;
   - окна (`ModalsSection`) берут `handlers` целиком;
   - дорожка: общее для всех дорожек (конфигурация, данные доски, обработчики) — в `SwimlaneBoardContext`, пропсами только своё и переходное. `SwimlaneProps` 48 → 23, `TaskLayerProps` 47 → 27; сборщик пропсов дорожки на 60 полей и свой компаратор `React.memo` (игнорировал конфиг и обработчики) удалены.

   - секция свимлейнов: 12 транзитных полей до `SwimlaneBoardContext` — срезом `board` (`SwimlanesSectionProps` 45 → 34, 2026-11-21).

   Дальше — по касанию, отдача у каждого следующего среза ниже: drag (~4 поля), ~~настройки отображения~~ (сделано 2026-11-21: срез `display` у секции свимлейнов, режим по фичам отключает в нём факт), раскладка. Цель — до 15 пропсов у `SprintPlannerView`.

4. **Сайдбар.** Сборщик `buildTaskSidebarContextValue` (перекладывал 60 полей в контекст на 70) удалён (2026-11-21): цели и их правку вкладка «Цели» берёт сама (`useSprintGoalsSummary`, `useSprintGoalManagement` — минус 16 полей контекста), бэклог — одним полем `backlog`. `TaskSidebarProps` 28 → 21. Затем убрана вкладка «Бэклог» сайдбара — со стартового релиза её всегда скрывал `hideBacklogTab`, а в настройках висел её переключатель. `SidebarSection` — оболочка панели, пропсы `TaskSidebar` проходят одним объектом; меню сайдбар берёт из стора (`contextMenuBlurOtherCards` — computed в `SprintPlannerUiStore`). Записи `SidebarSection` и `TaskSidebarProps` ушли из baseline.
   - ~~`backlogTaskRef` через шесть слоёв.~~ Убран 2026-11-21 вместе со сбросом «из бэклога»: без вкладки задачам вне спринта неоткуда взяться на доске (призраки предложений лежат в `dragPositions`), `handleBacklogTaskDrop` выходил на первой проверке, в режиме по фичам — до смены родителя не доходило.
   - ~~`contextMenuBlurOtherCards` через канбан и вкладку «Задачи».~~ Сделано 2026-11-21: правило меню — `cardContextMenuState` в `SprintPlannerUiStore`, карточки дорожки, канбана и сайдбара читают его хуком `useCardContextMenu` (computed на карточку); пропсы меню ушли из 19 файлов.

5. **Хуки-дирижёры (с 2026-11-21 меряем ширину, а не строки).** Порог 300 строк ловил цельные длинные хуки (`useSwimlaneLayout`, `useDebouncedApiSync`) и пропускал настоящие дирижёры: view model 279 строк отдавала 56 полей в `{...viewModel}`. Теперь `hook-inputs` ≤ 15 и `hook-outputs` ≤ 20; длину файла держит ESLint `max-lines` (500), отдельной метрики строк нет. Верх долга: `useSprintPlannerViewModel` → 56 выходов, `useSprintPlannerViewModelInteractions` → 42 входа, `useSprintPlannerHandlers` → 33 входа, `useSwimlaneLayout` → 30 выходов. Сделано 2026-11-21: view model отдаёт срезы по потребителю (`swimlanes`, `kanban`, `sidebar`, `controls`, `modals`, `dnd`, `presence`, `onboarding`, `placementToolbar`, `assigneePicker`), `SprintPlannerView` раздаёт их целиком — 56 выходов → 18, проброс View 80% → ниже порога. Сборка срезов теперь в view model (файл ~490 строк при `max-lines` 500 с учётом только кода): следующий шаг по касанию — сборку срезов свимлейнов и сайдбара вынести к их хукам.

### 2.8 Модель доски и классы под вью (высокий)

Направление и правила — [ARCHITECTURE.md](../ARCHITECTURE.md#модель-доски-и-классы-под-вью-направление-с-2026-11). Мерило — сколько транзитных слоёв проходит возможность карточки. Замер до: якорь плана (e56810eb) — 3 транзитных файла (`TaskBar`, `TaskBarOpacityLayer`, `TaskBarOpacityLayerChrome`) и 3 объявления одного поля из 7 UI-файлов фичи.

1. `SprintBoard` только на чтение поверх нынешних источников; перевести читателей карточки, секции, сайдбара.
   - 2026-11-21: модель (`features/sprint/model/SprintBoard.ts`) — задачи из кэша Query по подписке (ссылка на ответ, не копия), QA-задачи, карта и список задач с отметкой черновиков плана; `useSprintPlannerState` берёт их из модели. Первый перевод — `qaTasksMap`: его читают 6 листьев (карточка, элемент слоя, стрелки, секция, фильтр сайдбара, обработчики), каждый сам из модели; транзит убран из 14 мест (view model, секция, контекст дорожек, сайдбар и пять файлов вкладки «Задачи», где цепочка вела в `DraggableTask`, который значение не читал). Разработчики (2026-11-21): карточка, элемент слоя, сегмент, секция свимлейнов и сайдбар читают их из модели; убраны из контекста дорожек, секции и среза сайдбара. Карта задач остаётся значением вью: дорожки фич и онбординг-демо подменяют её своей — в модель уходит только доменная карта (задачи + QA), что уже сделано. Позиции (2026-11-21): `displayPositions` (стор + даты из трекера) и `visiblePositions` (только задачи доски, ссылка держится через `equals` computed вместо `useState` и ручного удержания) — в модели. Связи и заметки пока в хуках (`useDebouncedApiSync`); их перенос — вместе с действиями (шаг 2).
   - 2026-11-21, замер «после» на якоре плана: 3 транзитных файла → 0. Сегмент один раз задаёт, какая это карточка (`SwimlaneCardContext`: задача, позиция, отрезок), штриховка и бейдж «сдвинулось» читают якорь из стора позиций сами; `TaskBar`, `TaskBarOpacityLayer` и `TaskBarOpacityLayerChrome` про якорь больше не знают. Новая возможность карточки, которой нужны задача и её геометрия, теперь добавляется в лист и модель, без правки промежуточных слоёв.
2. Действия в модель (`useSprintPlannerHandlers`, `useSprintPlannerTaskHandlers`, комментарии, связи).
3. `SprintPlannerUiStore` (582 строки, ~35 несвязанных полей) — классы под вью по областям.

### 2.7 Производительность доски (высокий)

Замер — демо, dev, счётчики рендеров во временных пробах (`console.warn` в `SprintPlannerView`, `Swimlane`, `TaskBar`) и сценарий Playwright: простой 2 с, движение мыши внутри карточки, 12 наведений на карточки. После правки — тот же сценарий до и после.

1. ~~**Доска перерисовывала себя в простое.**~~ Исправлено 2026-11-21 (`useLatestCallback` для `useXarrow` во view model): петля «рендер → эффект → `updateXarrow` → рендер» давала ~7 перерисовок всей доски в секунду. Простой 2 с: доска / дорожки / карточки 14 / 84 / 168 → 0.
2. ~~**Наведение перерисовывало все дорожки и карточки.**~~ Исправлено 2026-11-21. Подсветка (наведение, кластер связей, факт, контекстное меню) идёт подпиской `SwimlaneHighlightProvider` мимо пропсов: карточка выбирает селектором своё (`useSwimlaneHighlightSelector`, `useSwimlaneCardContextMenu`), флаг наведения в `TaskBar` — `computed` MobX вместо чтения `hoveredTaskId` в рендере. 12 наведений: дорожки / карточки 96 / 372 → 0 / 86 (перерисовываются только карточки, у которых сменилось приглушение).
3. **Объекты, которые `SprintPlannerView` пересоздаёт на каждом рендере** (`assigneeOptions={{…}}`, `movePlacement`, `handlers` — новый объект от `useSprintPlannerHandlers`). Сейчас безвредно: доска без причины не рендерится. Станет важно, если секции начнут получать их целиком и рендериться чаще.

---

## 3. Не дублировать здесь

Правила слоёв, gate (`typecheck` / `lint` / `lint:unused` / `test`), консолидация `*Helpers*` — только в [`AGENTS.md`](../AGENTS.md) и [`ARCHITECTURE_UNIFORMITY.md`](./ARCHITECTURE_UNIFORMITY.md).

**Последнее обновление:** 2026-10-25
