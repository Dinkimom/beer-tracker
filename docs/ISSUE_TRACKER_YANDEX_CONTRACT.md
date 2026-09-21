# Контракт Yandex Tracker при появлении Jira

Цель: доработки второго провайдера не меняют поведение инстанса с `ISSUE_TRACKER_PROVIDER=yandex-tracker` (это значение по умолчанию).

UI по-прежнему ходит только в `/api/*`. Внешний трекер спрятан за `IssueTrackerProviderClient`. Типы провайдера содержат много `unknown` / `Record<string, unknown>` — **замок это Vitest-фикстуры**, не TypeScript и не markdown.

Связанный план переноса routes: [ISSUE_TRACKER_PROVIDER_MIGRATION.md](./ISSUE_TRACKER_PROVIDER_MIGRATION.md).

## Три контракта

| Слой | Что нельзя сломать | Где тесты |
|------|--------------------|-----------|
| **HTTP `/api/*` → UI** | JSON карточки задачи, сайдбара, спринтов, transitions | Волны 1–2: golden + route helpers |
| **Yandex-адаптер → Tracker REST** | URL, method, body | `*.contract.test.ts` + уже существующие `yandexTrackerProvider*.test.ts` |
| **Снимки Postgres** | Legacy flat payload и envelope `{ schemaVersion, provider, payload }` | golden mapper + `snapshotEnvelope.test.ts` + `yandexSnapshotSync.contract.test.ts` |

Jira пока stub: любая операция клиента — `422` и `code: issue_tracker_unsupported_operation`. Это отдельный контракт, его не смешивать с Yandex golden.

`pnpm test` гоняется **без** `ISSUE_TRACKER_PROVIDER=jira`. Дефолт провайдера проверяется явно.

## Волны

### Волна 1 (сделано) — characterization Yandex

Фикстуры и тесты: `lib/issueTrackerProvider/contracts/`.

- Golden: сырой Yandex issue → `IssueTrackerIssue` → `Task` (legacy payload, provider issue, snapshot envelope).
- Golden: `buildIssueDetailResponse` для сайдбара задачи.
- Golden: changelog logs → UI changelog и burndown issue.
- Каталог методов `IssueTrackerProviderClient`: новый метод на интерфейсе без записи в каталог — ошибка `tsc`; реализация Yandex без метода — падение теста; Jira stub отклоняет **все** методы каталога.
- Исходящие REST вызовы, которые адаптер делает сам (не через `lib/trackerApi`): URL/method/body.
- HTTP-тело `handleApiError` для `UnsupportedIssueTrackerOperationError`.

Правило правки golden: менять JSON только вместе с согласованным изменением продукта для Yandex, не «подгонять под Jira».

### Волна 2 (сделано) — JSON `/api/*` на замоканном провайдере

Хелперы: `lib/issues/issueTrackerRouteJson.ts`, `lib/sprints/sprintTrackerRouteJson.ts`.
Тесты: `yandexApiIssueRoutes.contract.test.ts`, `yandexApiSprintBoardRoutes.contract.test.ts`.

- `GET /api/issues/[issueKey]/task` — snapshot / envelope → `Task`
- `GET /api/issues/[issueKey]` — snapshot (unwrap envelope) или live issue + checklist
- `GET /api/issues/search` — `{ items: [{ key, summary, task }] }`
- `GET /api/issues/[issueKey]/transitions` и `POST .../transitions/batch`
- `GET /api/boards` (команды PG → `BoardListItem`) и `GET /api/boards/[boardId]` (колонки Yandex)
- `GET /api/sprints`, `POST /api/sprints`
- `GET /api/sprints/[sprintId]/score` и `burndown`

Эти тесты **не** гоняются против Jira-клиента.

### Волна 3 (сделано) — readers снимков и sync

- JS-readers payload (`backlog`, sprint membership, snapshot summary, stories mapper, overseer `issue_data`, `IssueSnapshotRow`) разворачивают envelope через `issueFieldsFromStoredSnapshot`.
- Golden: `yandexSnapshotSync.contract.test.ts` — тело инкрементального `_search` (`updatedAt` `{ from, to }` + `order: '+updatedAt'`, опционально `filter.queue` очередей команд), filter полного синка очереди, upsert envelope, паритет legacy vs envelope.
- Когда появится Jira mapper: те же golden-файлы плюс отдельные Jira-фикстуры; shared mapper не принимают, если сломался Yandex payload.

## Что тесты не заменят

Живой API Яндекса, OAuth/org-заголовки, уже лежащие в проде строки без envelope (для них нужна именно legacy-фикстура), поля, которые UI читает в обход типов.

Редкий smoke против реального Tracker — по желанию, не замок в CI.
