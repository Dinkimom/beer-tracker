# Миграция на провайдеры трекеров

Цель миграции — подготовить Beer Tracker к работе не только с Yandex Tracker, но и с Jira, не размазывая условия вида `if (provider === 'jira')` по `app/api/**`.

## Текущий статус

Уже есть первый слой абстракции:

- `lib/issueTrackerProvider/types.ts` — provider kinds, `IssueTrackerProviderClient`, первые доменные методы.
- `lib/issueTrackerProvider/registry.ts` — registry провайдеров.
- `lib/issueTrackerProvider/settings.ts` — хранение `organizations.settings.issueTracker` (не источник истины для выбора трекера).
- `getIssueTrackerProviderKind()` в `lib/env.ts` — **один** трекер на инстанс через `ISSUE_TRACKER_PROVIDER=yandex-tracker|jira`.
- `lib/issueTrackerProvider/yandexTrackerProvider.ts` — Yandex-реализация первых методов.
- `lib/issueTrackerProvider/clientFactory.ts` — создание `IssueTrackerProviderClient` из `Request`.

Текущее поведение:

- По умолчанию `ISSUE_TRACKER_PROVIDER` не задан → `yandex-tracker`.
- `jira` — валидный вид провайдера; runtime-адаптер пока stub.
- Yandex Tracker остаётся единственным полноценным adapter-ом.
- Старый Axios-фасад (`getTrackerApiFromRequest`, `createTrackerApiClient`) сохранён для routes, которые ещё не перенесены.

Уже переведены на `IssueTrackerProviderClient`:

- `GET /api/auth/myself`
- `GET /api/boards`
- `GET /api/boards/[boardId]`
- `GET /api/sprints`
- `POST /api/sprints`
- `GET /api/queues/search`
- `GET /api/queues/[queueKey]`
- `GET /api/fields/[fieldId]`
- `GET /api/screens/[screenId]`
- `GET /api/screens/[screenId]/fields`
- `GET /api/issues/search`
- `GET /api/issues/[issueKey]` live fallback/checklist
- `GET /api/issues/[issueKey]/task` через provider-aware snapshot mapper
- `GET /api/issues/[issueKey]/transitions`
- `GET /api/sprints/batch/task-parents`
- `GET /api/epics/[epicKey]/tasks`
- `GET /api/stories/[storyKey]/tasks`

## Целевая архитектура

Клиентская часть приложения по-прежнему обращается только к нашим Next.js API routes через `beerTrackerApi`.

Серверный route не должен знать о деталях Yandex/Jira API. Он должен получать provider-client:

```ts
const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
```

Дальше route вызывает доменные методы:

```ts
const boards = await issueTracker.listBoards();
const issue = await issueTracker.getIssue(issueKey);
const sprint = await issueTracker.createSprint(input);
```

Yandex/Jira различия должны жить внутри adapter-а:

- URL, auth headers, pagination.
- Формат board/sprint/issue payload.
- Статусы, transitions, workflow.
- Changelog/comments.
- JQL/Yandex search filters.
- Маппинг в доменную `Task`-модель.

## Правила Миграции

1. Route не должен импортировать `getTrackerApiFromRequest`, если нужная операция уже есть в `IssueTrackerProviderClient`.
2. Новый provider-метод должен описывать продуктовую операцию, а не HTTP-метод внешнего API.
3. Не добавлять Jira-условия в routes. Если операция не реализована в Jira adapter-е, adapter должен бросать единообразную ошибку.
4. Yandex adapter должен сохранять текущий JSON-контракт route-а до отдельной согласованной миграции API.
5. Сложные routes переносить маленькими группами: добавить методы, реализовать Yandex, перевести 1-3 route, покрыть focused tests.
6. Для snapshot/sync слоя сначала нормализовать типы, потом подключать Jira.

## Волна 1: Простые Read Routes

Статус: сделано.

Уже перенесено:

- `/api/auth/myself`
- `/api/boards`
- `/api/boards/[boardId]`
- `/api/sprints` GET/POST
- `/api/queues/search`
- `/api/queues/[queueKey]`
- `/api/fields/[fieldId]`
- `/api/screens/[screenId]`
- `/api/screens/[screenId]/fields`

Нужные методы:

- `getBoard(boardId)`
- `searchQueues(query)`
- `getQueue(queueKey)`
- `getField(fieldId)`
- `getScreen(screenId)`
- `getScreenFields(screenId)`

Критерий готовности волны:

- Эти routes больше не импортируют `getTrackerApiFromRequest`.
- Yandex adapter использует текущие `lib/trackerApi/*` helpers или эквивалентный код без смены ответа.
- Focused tests фиксируют URL/payload для Yandex adapter-а.

## Волна 2: Issue Read/Search

Статус: сделано.

Routes:

Уже перенесено:

- `/api/issues/search`
- `/api/issues/[issueKey]` GET, включая fallback к live tracker и checklist.
- `/api/issues/[issueKey]/task` через provider-aware snapshot mapper без live token.
- `/api/sprints/batch/task-parents`
- `/api/epics/[epicKey]/tasks`
- `/api/stories/[storyKey]/tasks`

Нужные методы:

- `getIssue(issueKey)`
- `getIssueChecklist(issueKey)`
- `searchIssuesOnBoard(boardId, query)`
- `getIssueChildren(parentKey, boardId)`
- `getSprint(sprintId)`
- `getTasksInSprintWithParents(sprintId, options)`
- `mapProviderIssueToTask(issue, integration)`

Пока не реализовано, но понадобится для следующих issue routes:

- `getIssuesByKeys(issueKeys)`

Особое внимание:

- Не тащить `TrackerIssue` как общий тип provider-а.
- Ввести нейтральный тип issue payload или `ProviderIssue`.
- Сохранить текущий `Task` JSON для UI.
- Не ломать fallback из `issue_snapshots`.

## Волна 3: Workflow и Transitions

Статус: сделано.

Routes:

Уже перенесено:

- `/api/issues/[issueKey]/transitions`
- `/api/issues/transitions/batch`
- `/api/issues/[issueKey]/transitions/[transitionId]/fields`
- `/api/queues/[queueKey]/workflows`
- `/api/queues/[queueKey]/workflow-screens`

Нужные методы:

- `getIssueTransitions(issueKey)`
- `listIssueTransitionsBatch(issueKeys)`
- `getTransitionFields(issueKey, transitionId)`
- `getQueueWorkflows(queueKey)`
- `getQueueWorkflowScreens(queueKey)`

Особое внимание:

- Jira transitions отличаются от Yandex workflow screens.
- Нужен доменный `IssueTransition`, пригодный для UI.
- Возможности, которых нет у provider-а, должны возвращать понятную unsupported-ошибку.

## Волна 4: Mutations

Статус: сделано.

Routes:

Уже перенесено:

- `/api/issues`
- `/api/issues/[issueKey]/create-related`
- `/api/issues/[issueKey]` PATCH
- `/api/issues/[issueKey]/checklist` GET/POST/PUT/DELETE
- `/api/issues/[issueKey]/checklist/[itemId]` PATCH/DELETE
- `/api/issues/[issueKey]/sprint`
- `/api/issues/[issueKey]/status`
- `/api/issues/[issueKey]/update-work`

Нужные методы:

- `createIssue(input)`
- `updateIssue(issueKey, patch)`
- `transitionIssue(issueKey, input)`
- `addIssueToSprint(issueKey, sprintId)`
- `removeIssueFromSprint(issueKey, sprintId)`
- `removeIssueFromAllSprints(issueKey)`
- `createRelatedIssue(sourceIssueKey, input)`
- `createChecklistItem(issueKey, input)`
- `updateChecklistItem(issueKey, itemId, patch)`
- `deleteChecklistItem(issueKey, itemId)`

Особое внимание:

- Story/test points в Jira почти наверняка будут custom fields.
- Sprint membership в Jira зависит от Agile API и board context.
- Checklist может отсутствовать без plugin-а, поэтому нужен capability-флаг или unsupported-ошибка.

## Волна 5: Changelog, Score, Burndown

Статус: сделано.

Routes:

Уже перенесено:

- `/api/issues/[issueKey]/changelog` (live fetch через provider)
- `/api/issues/changelog` (cache-only из PostgreSQL; live fetch — sync/resolve helper)
- `/api/sprints/[sprintId]/burndown`
- `/api/sprints/[sprintId]/score`

Нужные методы:

- `getIssueChangelogWithComments(issueKey)`
- `getIssuesChangelogBatch(issueKeys)`
- `listSprintIssues(sprintId, options)`
- `getSprint(sprintId)`
- `getBurndownIssuesForKeys(issueKeys, sprint, issueByKey)`

Особое внимание:

- Jira changelog и comments отличаются по pagination и структуре.
- Burndown replay использует provider-neutral `IssueTrackerBurndownIssue` (`lib/issueTrackerProvider/changelogTypes`).
- Перед Jira нужно нормализовать changelog events в provider-neutral форму.

## Волна 6: Sync и Snapshots

Статус: сделано (changelog sync + org sync core).

Файлы:

- `lib/sync/runOrgSync.ts` — provider client вместо `createTrackerAxiosInstance`
- `lib/sync/runFullSyncModes.ts`
- `lib/sync/fullOrgBoardScan.ts`
- `lib/sync/runChangelogSyncWithProgress.ts`
- `lib/snapshots/syncIssueChangelogsFromTracker.ts`
- `lib/snapshots/issueChangelogResolve.ts`

Уже перенесено:

- incremental/full sync через `listIssuesUpdatedInRange` / `listIssuesForBoard`
- changelog batch sync через `getIssuesChangelogBatch`
- `resolveIssueChangelogBatchForOrganization` принимает `issueTracker`

Нужные методы (реализованы для Yandex):

- `listIssuesUpdatedInRange(since, until, options)`
- `listIssuesForBoard(boardId, options)`
- `getIssuesChangelogBatch(issueKeys)` (из волны 5)

Особое внимание:

- Jira incremental sync лучше строить на JQL по `updated`.
- `issue_snapshots.payload` пока хранит сырой Yandex payload (`yandexIssueFromProviderIssue` при upsert).
- Для нескольких providers в одной БД нужен `provider` или `external_source` в ключах snapshot/changelog таблиц, если возможны пересечения issue keys.

## БД и Настройки

Статус: neutral aliases в коде (шаг 1) — сделано. Миграция колонок БД — отложена.

Текущая БД всё ещё Yandex-oriented (имена колонок без изменений):

- `organizations.tracker_org_id` → `readIssueTrackerExternalOrgId` / `externalOrgId`
- `organization_secrets.encrypted_tracker_token` → `DB_ORGANIZATION_SECRETS_ACCESS_TOKEN_COLUMN`
- `teams.tracker_board_id` → `readIssueTrackerTeamBoardId` / `IssueTrackerTeamBinding.boardId`
- `teams.tracker_queue_key` → `readIssueTrackerTeamQueueKey` / `IssueTrackerTeamBinding.queueKey`
- `settings.trackerIntegration` — правила маппинга планера (отдельно от `settings.issueTracker.provider`)

Модуль: `lib/issueTrackerProvider/storageAliases.ts`

План переименования колонок (позже):

1. ~~Добавить neutral aliases в коде и DTO.~~
2. Сохранить старые колонки для обратной совместимости.
3. Добавить новые настройки provider-а для Jira auth/base URL.
4. После стабилизации Jira adapter-а планировать миграции БД.

Не нужно переименовывать всё сразу: это даст большой diff без функционального выигрыша.

## Provider-neutral Changelog и Snapshot Envelope

Статус: сделано (базовый слой).

Модули:

- `lib/issueTrackerProvider/changelogTypes.ts` — `IssueTrackerChangelogEntry`, `IssueTrackerBurndownIssue`, …
- `lib/issueTrackerProvider/changelogNormalizer.ts` — `changelogEntriesFromRawIssueLogs`, `buildIssueTrackerBurndownIssueFromPayloadAndLogs`
- `lib/issueTrackerProvider/snapshotEnvelope.ts` — `wrapIssueSnapshotForStorage` / `unwrapIssueSnapshotPayload`

Поведение:

- Changelog для UI/burndown нормализуется в provider-neutral форму до записи в `issue_changelog_events`.
- Новые строки `issue_snapshots.payload` пишутся как envelope `{ schemaVersion, provider, payload }`.
- Legacy flat Yandex payload при чтении разворачивается с `provider: 'yandex-tracker'` по умолчанию.
- `lib/ytrackerRawIssues.ts` оставлен как thin re-export для обратной совместимости burndown-кода.

Осталось для multi-provider:

- Протянуть `unwrapIssueSnapshotPayload` во все read-пути `issue_snapshots` (сейчас основной write-path sync).
- Jira-адаптер для raw changelog → neutral mapper.

## Jira Adapter Skeleton

Статус: сделано (skeleton).

- `lib/issueTrackerProvider/jiraProvider.ts` — `kind: 'jira'`, все методы → `UnsupportedIssueTrackerOperationError`
- `lib/issueTrackerProvider/errors.ts` — `status: 422`, поля `operation` / `providerKind`
- `resolveIssueTrackerProvider('jira')` регистрирует skeleton
- `handleApiError` → `code: issue_tracker_unsupported_operation`

Дальше по мере реализации Jira:

- Реализовать методы `IssueTrackerProviderClient` по приоритету read routes
- Jira credentials в `settings.issueTracker` (email, apiToken, baseUrl)
- Убрать `assertYandexTrackerProvider` там, где маршрут уже provider-neutral

## Ошибки и Capabilities

`UnsupportedIssueTrackerOperationError` — реализовано (см. Jira skeleton).

Для отличий provider-ов позже стоит добавить capabilities:

- `supportsChecklists`
- `supportsWorkflowScreens`
- `supportsSprintMutation`
- `supportsIssueLinks`
- `supportsWorkEstimates`

Route должен либо использовать capability, либо доверять adapter-у и отдавать понятную ошибку через `handleApiError`.

## Проверки Для Каждого Среза

Минимум:

- Focused ESLint по изменённым файлам.
- Focused Vitest на adapter/route helper.
- `pnpm typecheck`.
- `pnpm test`, если меняется общий контракт или shared mapper.

Полный `pnpm lint` сейчас может падать на существующем lint-долге вне migration-файлов. Для срезов миграции важно, чтобы focused ESLint по изменённым файлам был чистым.

## Контрактные тесты (Yandex не ломать)

Пока появляется Jira, текущее поведение Yandex фиксируется автотестами. План волн, golden-фикстуры и правила правки контракта: [ISSUE_TRACKER_YANDEX_CONTRACT.md](./ISSUE_TRACKER_YANDEX_CONTRACT.md).

Код: `lib/issueTrackerProvider/contracts/`.

## Definition of Done

Route считается перенесённым, если:

- В route нет `getTrackerApiFromRequest`.
- Route использует `getIssueTrackerProviderClientFromRequest` или более узкий provider-aware helper.
- Yandex adapter покрыт тестом на URL/payload или используется уже покрытый `lib/trackerApi/*` helper.
- Ответ route-а для текущего Yandex сценария не изменился.
- Если provider `jira` выбран, route получает понятную unsupported-ошибку, а не Yandex-specific stack trace.

Вся миграция считается завершённой, если:

- В `app/api/**` нет прямых live-вызовов Yandex через Axios, кроме временно задокументированных исключений.
- Sync работает через provider contract.
- Snapshot/changelog payload либо provider-neutral, либо явно содержит provider/source.
- Admin UI позволяет выбрать provider и настроить креденшалы.
- Есть контрактные tests, которые можно запускать для Yandex и Jira adapter-ов.
