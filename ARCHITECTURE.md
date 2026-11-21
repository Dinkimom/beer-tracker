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
| `lib/<domain>` | SQL, транзакции, оркестрация для routes | `lib/sprints/`, `lib/admin/`, `lib/issues/` |

**ESLint:** `api/no-direct-db`, `layers/no-app-api-import`, `layers/no-features-import` (`lib` ↛ `features`). Правила и чеклисты волн: [`docs/ARCHITECTURE_UNIFORMITY.md`](./docs/ARCHITECTURE_UNIFORMITY.md), краткие нормы — [`AGENTS.md`](./AGENTS.md).

Подробно про клиент и маршруты — [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md), маршрут → бэкенды — [`docs/API_BACKENDS.md`](./docs/API_BACKENDS.md).

## Multi-tenancy и авторизация

**Сессия продукта.** HttpOnly cookie `bt_product_session` с подписанным HMAC токеном (`AUTH_SESSION_SECRET`), в payload — id пользователя (`staff.id`): [`lib/auth/constants.ts`](./lib/auth/constants.ts), [`lib/auth/sessionToken.ts`](./lib/auth/sessionToken.ts), чтение — `getProductUserIdFromRequest` в [`lib/auth/productSession.ts`](./lib/auth/productSession.ts). Пароля нет (`/api/auth/login` всегда 401): сессию выдаёт `POST /api/auth/onprem/tracker-session` — токен трекера проверяется через `/myself`, по нему находится сотрудник организации ([`lib/auth/onpremTrackerSessionHelpers.ts`](./lib/auth/onpremTrackerSessionHelpers.ts), [`lib/onPrem/establishProductSessionFromTrackerTokenHelpers.ts`](./lib/onPrem/establishProductSessionFromTrackerTokenHelpers.ts)).

**Организация (tenant) на запрос.** Браузер хранит активную организацию в localStorage (`beer-tracker-active-organization-id`), `beerTrackerApi` шлёт её в заголовке `x-organization-id` ([`lib/tenantHttpConstants.ts`](./lib/tenantHttpConstants.ts), [`lib/axios.ts`](./lib/axios.ts)). Резолв на сервере — [`lib/api-tenant.ts`](./lib/api-tenant.ts):

- `requireTenantContext` — большинство маршрутов планера (у роутов спринта — через `requireSprintRouteContext` в [`lib/sprints/sprintRouteContext.ts`](./lib/sprints/sprintRouteContext.ts)). Организация из заголовка (если есть в БД) или первая организация; нужна сессия (401) и членство (403), роль — из членства ([`lib/api/apiTenantHelpers.ts`](./lib/api/apiTenantHelpers.ts)).
- `requireTenantForOrganization` и надстройки `requireTenantWithPlannerProfile` / `requireTenantWithAdminProfile` — маршруты с `organizationId` в пути: обязательна сессия, членство (или супер-админ), профиль доступа из [`lib/access/orgAccess.ts`](./lib/access/orgAccess.ts). Админ организации — `requireOrgAdminForOrganizationRoute` / `requireOrgAdminOrganization` ([`lib/admin/adminOrgRouteHelpers.ts`](./lib/admin/adminOrgRouteHelpers.ts)).
- Членство сейчас «виртуальное»: любой сотрудник (`staff`) — участник любой организации, `org_admin` — только суперадмин продукта (`admins`). Изоляция организаций друг от друга — задача облачного режима.
- `requireTenantPathMatchesHeader` — защита от расхождения id в пути и заголовке.

**Вход в `/api/*`.** [`proxy.ts`](./proxy.ts) без валидной сессии отвечает 401 (`code: session_required`), кроме публичных роутов из [`lib/auth/apiAccessGate.ts`](./lib/auth/apiAccessGate.ts): `auth/*`, `oauth/*`, `/api/mcp` (свой 401 с `WWW-Authenticate`), `internal/*` (секрет cron), `onprem/*` (первичная настройка) и `sprint-context` с Bearer-токеном MCP. Новый публичный роут — только через этот список. Клиент на 401 уводит на `/auth-setup`, где сессия выдаётся заново по токену трекера. Сохранённый токен трекера организации запросу без сессии не выдаётся ([`lib/trackerRequestConfig.ts`](./lib/trackerRequestConfig.ts)). Для страниц proxy только проставляет PWA-заголовок.

**Креды трекера.** Тип трекера и URL API — `organizations.settings.issueTracker` ([`lib/issueTrackerProvider/settings.ts`](./lib/issueTrackerProvider/settings.ts)). Токен на запрос ([`lib/trackerRequestConfig.ts`](./lib/trackerRequestConfig.ts), `resolveTrackerApiConfigFromRequest`): сначала `X-Tracker-Token` пользователя, иначе сохранённый токен организации. Токен пользователя лежит в localStorage браузера с привязкой к организации ([`lib/trackerTokenStorage.ts`](./lib/trackerTokenStorage.ts); для Jira Cloud OAuth — ещё refresh-токен, cloudId и срок, обновление — [`lib/atlassianOAuth/browserRefresh.ts`](./lib/atlassianOAuth/browserRefresh.ts)). Токен организации хранится в `organization_secrets` зашифрованным AES-256-GCM ключом `ORG_SECRETS_ENCRYPTION_KEY` ([`lib/crypto-org-secrets.ts`](./lib/crypto-org-secrets.ts), [`lib/organizations/organizationSecretsRepository.ts`](./lib/organizations/organizationSecretsRepository.ts)); [`lib/organizations/organizationTrackerCredentials.ts`](./lib/organizations/organizationTrackerCredentials.ts) отдаёт его серверным вызовам (админка, sync-worker) и ротирует OAuth-токен Atlassian. Ошибки конфигурации — `TrackerApiConfigError` (400/401/403/404/422).

## Провайдеры трекера: `lib/issueTrackerProvider` и легаси `lib/trackerApi`

- **[`lib/issueTrackerProvider/`](./lib/issueTrackerProvider/)** — основной слой. `IssueTrackerProviderClient` (контракт в `types.ts`) с доменными методами: задачи, спринты, доски, переходы, changelog, очереди. Реестр [`registry.ts`](./lib/issueTrackerProvider/registry.ts): `tracker` → `yandexTrackerProvider.ts`, `jira-cloud` / `jira-onprem` → `jiraProvider.ts`. Клиент в route — `getIssueTrackerProviderClientFromRequest(request)` из [`clientFactory.ts`](./lib/issueTrackerProvider/clientFactory.ts); по токену организации без запроса — `getIssueTrackerProviderClientForOrganization`. Тип и web-base трекера — `client.providerKind` / `client.webBaseUrl`. Контрактные тесты — `lib/issueTrackerProvider/contracts/`.
- **[`lib/trackerApi/`](./lib/trackerApi/)** — легаси-функции Yandex Tracker REST поверх axios. Сейчас их в основном вызывает Yandex-адаптер (`yandexTrackerProvider.ts`) и маппинг (`mapTrackerIssueToTask`, `extractDevelopers`); прямой вызов из нового route — нет.
- **Сырой axios** — `getTrackerApiFromRequest` ([`lib/api-tracker.ts`](./lib/api-tracker.ts)) / `createTrackerApiFromRequest` ([`lib/tracker-client.ts`](./lib/tracker-client.ts)); остался в нескольких маршрутах и хелперах, не перенесённых на провайдер. Трогать по касанию.

Новый код — только через `IssueTrackerProviderClient`, без `if (provider === 'jira')` в `app/api/**`. Подробнее: [`docs/ISSUE_TRACKERS.md`](./docs/ISSUE_TRACKERS.md), [`docs/ISSUE_TRACKER_PROVIDER_MIGRATION.md`](./docs/ISSUE_TRACKER_PROVIDER_MIGRATION.md).

## React Query (серверный кэш)

| Данные | Ключ / хук | Примечание |
|--------|------------|------------|
| Задачи спринта (основной список) | `sprintTasksQueryKey` → `['tasks', sprintId, boardId]` | `useTasks` на странице и в `useSprintPlannerState` (один кэш), полный ответ — `useReloadTasks`; оптимистичные правки списка — `patchSprintTasksQuery` |
| Списки спринтов по доске | `sprintsQueryKey` → `['sprints', boardId]` | [`useSprints`](./features/sprint/hooks/useSprints.ts) |
| Доски | см. [`useBoards`](./features/board/hooks/useBoards.ts) | |

На `/demo/planner` ключи задач и спринтов получают сегмент `'demo'` (`['tasks', 'demo', …]`, `['sprints', 'demo', boardId]`), чтобы не смешивать кэш с продуктом.

**Фоновое обновление:** на основной странице [`useSprintTasksBackgroundRefresh`](./features/task/hooks/useSprintTasksBackgroundRefresh.ts) раз в минуту (только при видимой вкладке, не для archived/released) запрашивает `/api/tracker?skipSnapshots=1`: серверный in-memory кэш или живой Tracker, без снимка PG. Ответ кладётся в кэш, только если `dataUpdateCount` не изменился за время запроса и нет активных мутаций — оптимистичные правки не откатываются.

Источник правды по составу задач с трекера — **кэш Query**. Инвалидация и `setQueryData` должны использовать **тот же ключ**, что и `useTasks` (см. `sprintTasksQueryKey` в `features/task/hooks/useTasks.ts`).

## MobX (`lib/layers/application/mobx/`)

Классы сторов: `lib/layers/application/mobx/stores/` (`TaskPositionsStore`, `SprintPlannerUiStore`, `SprintMovePlacementStore`); корневой стор: [`lib/layers/application/mobx/createRootStore.ts`](./lib/layers/application/mobx/createRootStore.ts).

| Стор | Назначение |
|------|------------|
| `TaskPositionsStore` | Позиции карточек на свимлейне: `observable.map<taskId, TaskPosition>`, загрузка `fetchSprintPositions`, debounce сохранений, поколения ответов чтобы устаревший `fetch` не затирал локальные правки после DnD |
| `SprintPlannerUiStore` | Преходящий UI планера: поиск, контекстное меню, hover, сегменты фаз, фокус комментария и т.д. |
| `SprintMovePlacementStore` | Сессия «Запланировать в другом спринте»: задача или заметка показывается на доске целевого спринта до подтверждения или отмены |

Доступ к сторам: `useRootStore()` в клиентских компонентах. Для позиций в планере спринта типичен фасад [`useTaskPositionsApi`](./hooks/useTaskPositionsApi.ts) (внутри — тот же `TaskPositionsStore`).

## Модель доски и классы под вью (направление с 2026-11)

**Зачем.** Доску дорого менять, потому что данным доски некуда принадлежать: задачи лежат в кэше Query, позиции в MobX, заметки и связи в стейте хуков. Склеивают их ~65 хуков `SprintPlanner/hooks`, и до листа значение доходит пропсами через 3–5 слоёв. Пример: якорь плана уже лежал в `TaskPositionsStore`, но сегмент вычислял его и передавал `TaskBar` → `TaskBarOpacityLayer` → `TaskBarOpacityLayerChrome` → `TaskBarCornerBadges` — три транзитных файла и три объявления одного поля. По этому же счёту («сколько транзитных слоёв прошла возможность карточки») проверяем, что направление работает.

**Слои:**

| Слой | Что | Где |
|------|-----|-----|
| Доменная модель | `SprintBoard` — композиция небольших классов по доменам: задачи, позиции, заметки, связи. Computed (карта задач, QA-задачи, задачи по людям, доска с заметками) и действия (переместить, перенести в спринт, сохранить связь). Без React | `features/sprint/model/` (`SprintBoard`); сторы позиций и сессий — `lib/layers/application/mobx/` |
| Классы под вью | По области интерфейса, не общий склад: подсветка карточек, инструменты размещения, редактирование заметок, окна и панели, раскладка дорожек. Знают модель, отдают решения для листа (`isCardDimmed(taskId)`) | рядом с моделью |
| React-хуки | Только React-специфика: dnd-kit, эффекты DOM, подписка на Query и SSE, мост «кэш → модель» | `features/**/hooks` |
| Презентационные компоненты | Общие примитивы и `TaskCard` — на пропсах, без модели: их рендерят разные экраны | `components/`, `features/task/components/TaskCard` |

**Правила:**
- Источник правды не дублируется. Задачи остаются в кэше Query: модель держит ссылку на снимок (`observable.ref`), который кладёт мост-хук, а не копию; правки — как и раньше, через `patchSprintTasksQuery`.
- Лист читает модель сам (`useSprintBoard()`) и знает только, какая он карточка: это задаёт один раз сегмент через `SwimlaneCardContext` (задача, позиция, отрезок). Промежуточный слой не передаёт данные доски дальше.
- Компонент, который читает модель или вью, — `observer`. Без него он молча показывает устаревшее.
- Модель режется по доменам, а не растёт одним классом. Новое правило доски — метод или computed доменного класса, не новый `use*`-хук и не `*Helpers`.
- Пороги `pnpm lint:shape` — сигнал, а не цель: дробить ради порога не нужно.

**Порядок перехода:** 1) модель только на чтение поверх нынешних источников, перевод читателей (карточка, секция, сайдбар); 2) действия в модель вместо `useSprintPlannerHandlers` и соседей; 3) `SprintPlannerUiStore` → классы под вью. Ход — в [`docs/REFACTORING_BACKLOG.md`](./docs/REFACTORING_BACKLOG.md), п. 2.8.

## Списки и документы с отложенной записью

Не React Query: данные на клиенте, запись на сервер **с задержкой** после серии правок (см. `DELAYS.DEBOUNCE` в `utils/constants`).

| Паттерн | Файл | Подходит для |
|---------|------|----------------|
| **`SyncedList`** | [`lib/layers/application/mobx/syncedList.ts`](./lib/layers/application/mobx/syncedList.ts) | **Список сущностей** на спринт: загрузка массива, правки/создание/удаление по элементу, отложенный save (и опционально батч), слияние с realtime без потери несохранённых правок. MobX-класс, экземпляр на спринт; побочные эффекты — в методах, не в апдейтере `setState`. |
| **`useFeatureLanesApi`** | [`hooks/useApiStorage.ts`](./hooks/useApiStorage.ts) | **Один JSON-документ** на спринт (`FeatureLanesDocument`) — черновые строки фич, порядок и скрытие. Целиком пересохраняется после дебаунса. |

Экземпляры `SyncedList` в модели доски (`board.links`, `board.comments`):

| Данные | Где |
|--------|-----|
| Связи задач (стрелки) | [`features/sprint/model/sprintLinks.ts`](./features/sprint/model/sprintLinks.ts) |
| Заметки, фото и схемы на дорожках | [`features/sprint/model/sprintComments.ts`](./features/sprint/model/sprintComments.ts) — плюс версии и очередь сохранений: конфликт версии показывает тост и перечитывает список |

Связи и заметки живут дольше модели доски: модель пересоздаётся при смене дат спринта, списки — только при смене спринта.

`useFeatureLanesApi` **не** строится на `SyncedList`: строки фич — монолитный JSON-документ, а не список с операциями по элементу; проще отдельный `useState` + один таймер.

## Задачи и разработчики в `SprintPlanner`, оптимистичные правки

1. **Один кэш:** и страница, и `useSprintPlannerState` вызывают `useTasks(sprintId, boardId)` с тем же ключом — React Query **не дублирует** запрос; в планере **`tasks` и `developers`** берутся только из `tasksQuery.data` (пропсы с страницы не передаются).

2. **Оптимистичные правки:** обработчики вызывают `setTasks`, который внутри дергает **`patchSprintTasksQuery`** — обновляется только массив `tasks` внутри объекта `TasksResponse` в кэше (`developers` и `sprintInfo` сохраняются).

3. **Полная перезагрузка:** `useReloadTasks` подменяет весь `TasksResponse` в кэше; подписчики `useTasks` получают новые данные.

## Realtime (SSE)

REST остаётся единственным каналом записи; realtime только сообщает другим вкладкам, что перечитать.

- **Сервер → клиент:** `GET /api/realtime?sprintId=&organizationId=&clientId=&presence=` ([`app/api/realtime/route.ts`](./app/api/realtime/route.ts)) отдаёт Server-Sent Events ([`lib/realtime/sprintRealtimeSse.ts`](./lib/realtime/sprintRealtimeSse.ts)): tenant через `requireTenantContext`, ping каждые 25 с, при открытии — снимок таймера.
- **Шина:** [`lib/realtime/sprintRealtimeBus.ts`](./lib/realtime/sprintRealtimeBus.ts) — слушатели в памяти процесса плюс Redis pub/sub (канал `beer-tracker:sprint-realtime:<org>:<sprint>`) для нескольких инстансов. В `next dev` Redis для realtime выключен, включается `REALTIME_REDIS_IN_DEV=1` ([`lib/realtime/sprintRealtimeConstants.ts`](./lib/realtime/sprintRealtimeConstants.ts)).
- **Публикация:** маршруты после мутации вызывают `notifySprintRealtime(request, organizationId, sprintId, resources)` ([`lib/realtime/notifySprintRealtime.ts`](./lib/realtime/notifySprintRealtime.ts)). `originClientId` берётся из заголовка `x-realtime-client-id`, поэтому вкладка-автор своё эхо не получает.
- **События** ([`lib/realtime/sprintRealtimeTypes.ts`](./lib/realtime/sprintRealtimeTypes.ts)): `sprint.changed` со списком `resources` (`positions`, `links`, `comments`, `reactions`, `goals`, `tasks`, `retro`, `agentSessions`) и опционально `issueStatus` / `issueMembership`; `sprint.presence` — кто смотрит спринт и что делает (фокус, жест, вид доски; `PUT /api/realtime/presence`, [`lib/realtime/sprintPresence.ts`](./lib/realtime/sprintPresence.ts)); `sprint.timer` — общий таймер ([`lib/realtime/sprintTimerStore.ts`](./lib/realtime/sprintTimerStore.ts)).
- **Клиент:** [`hooks/useSprintRealtimeSync.ts`](./hooks/useSprintRealtimeSync.ts) открывает `EventSource` и раскладывает ресурсы по обработчикам. В планере ([`useSprintPlannerState.ts`](./features/sprint/components/SprintPlanner/hooks/useSprintPlannerState.ts)): `positions` → `TaskPositionsStore.reconcileRemoteSprint` (MobX, pending-правки не затираются); `links` / `comments` → `board.links` / `board.comments` → `reloadFromRemote` у `SyncedList` (слияние через [`lib/realtime/mergeRemoteItemsWithPending.ts`](./lib/realtime/mergeRemoteItemsWithPending.ts)); `tasks` → точечный патч кэша React Query (`patchSprintTaskStatusInQueries`, `upsertSprintTaskInQueries`, `removeSprintTaskFromQueries`), без payload — `reloadSprintTasksQueries`; `goals` / `agentSessions` → `invalidateQueries`. Ретро — [`features/retro/hooks/useRetroBoardCollaboration.ts`](./features/retro/hooks/useRetroBoardCollaboration.ts). На `/demo/planner` SSE не открывается.

- **Квартальный план:** свой поток `GET /api/realtime/quarter?year=&quarter=&organizationId=&clientId=` ([`lib/realtime/quarterRealtime.ts`](./lib/realtime/quarterRealtime.ts)) на той же шине, событие `quarter.changed` (`notifyQuarterRealtime` после записи плана). Клиент перечитывает план и сливает его со своими несохранёнными правками ([`features/quarterly-plan/quarterlyPlanSync.ts`](./features/quarterly-plan/quarterlyPlanSync.ts), правила QS5–QS7 в [`docs/QUARTERLY_PLAN_RULES.md`](./docs/QUARTERLY_PLAN_RULES.md)). Присутствие — то же хранилище, что у спринта (`SprintPresenceScope`: id спринта или квартал), событие `quarter.presence`; фокус пишет тот же `PUT /api/realtime/presence` с `year` и `quarter` вместо `sprintId` ([`features/quarterly-plan/QuarterlyPlanPresence.tsx`](./features/quarterly-plan/QuarterlyPlanPresence.tsx)).

## Чистые функции (`lib/`, хелперы планера)

Геометрия, мапперы в API, валидация плана свимлейна — без React/MobX; покрывать unit-тестами (Vitest). `lib/` не импортирует `@/features/**`.

## См. также

- Подсказки для CI и линтеров: [AGENTS.md](./AGENTS.md)
- Единообразие слоёв (P1–P4): [docs/ARCHITECTURE_UNIFORMITY.md](./docs/ARCHITECTURE_UNIFORMITY.md)
- UI-долг и shared components: [docs/REFACTORING_BACKLOG.md](./docs/REFACTORING_BACKLOG.md)
- MobX, dnd-kit, `lib/`: раздел «Слои» в [AGENTS.md](./AGENTS.md)
