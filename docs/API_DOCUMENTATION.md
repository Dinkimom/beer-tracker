# Документация API Beer Tracker

Как устроены клиентский и серверный слои `/api/*`. Какой маршрут к каким системам ходит (трекер, снимки, PostgreSQL, S3, Redis) — **[API_BACKENDS.md](./API_BACKENDS.md)**. Общая карта слоёв, tenant/auth, realtime и провайдеры трекера — **[ARCHITECTURE.md](../ARCHITECTURE.md)**.

```text
UI (features/, components/, hooks/)
   │  только функции из lib/api/*
   ▼
lib/api/<домен>.ts  →  getPlannerBeerTrackerApi()  →  axios beerTrackerApi (baseURL /api)
   │  HTTP + cookie сессии + заголовки tenant/трекера
   ▼
app/api/**/route.ts  (tenant, Zod, статусы, кэш; без SQL)
   ▼
lib/<домен>/*  →  issue tracker (Yandex Tracker / Jira) | PostgreSQL | S3 | Redis
```

## Правила

1. **Клиент не ходит в трекер напрямую** — только в Next.js API.
2. **UI вызывает `/api/*` только через `lib/api/*`.** Raw `fetch('/api/...')` в UI запрещён ESLint-правилом `client/no-raw-api-fetch`; импорт `beerTrackerApi` из `@/lib/axios` и любые импорты из `@/app/api/**` в UI запрещены правилом `layers/no-app-api-import` (см. `eslint.config.mjs`).
3. **Route не пишет SQL** (`api/no-direct-db`): SQL — в `lib/<домен>/*Repository.ts`, оркестрация — в `lib/<домен>/*RouteHelpers.ts`. Подробно — раздел «API routes и доступ к БД» в [AGENTS.md](../AGENTS.md).
4. **DTO ответов** живут в `lib/api/types.ts` или `lib/<домен>`, не в `route.ts`.

## Клиент: `lib/api/*`

- Модули по доменам: `lib/api/sprints.ts`, `lib/api/issues.ts`, `lib/api/sprintGoals.ts`, `lib/api/admin/` и т.д. [`lib/api/index.ts`](../lib/api/index.ts) реэкспортирует их; [`lib/beerTrackerApi.ts`](../lib/beerTrackerApi.ts) — однострочный реэкспорт `lib/api` для старых импортов `@/lib/beerTrackerApi`.
- HTTP-клиент берётся через `getPlannerBeerTrackerApi()` из [`lib/plannerBeerTrackerApiOverride.ts`](../lib/plannerBeerTrackerApiOverride.ts): на `/demo/planner` там подменённый клиент на фикстурах, в остальном приложении — `beerTrackerApi` из [`lib/axios.ts`](../lib/axios.ts).
- Интерсепторы `beerTrackerApi` (`lib/axios.ts`):
  - `withCredentials` — cookie сессии продукта `bt_product_session`;
  - `X-Tracker-Token` — токен трекера пользователя из localStorage ([`lib/trackerTokenStorage.ts`](../lib/trackerTokenStorage.ts), ключ `beer-tracker-tracker-token`, привязан к организации);
  - `x-tracker-cloud-id` — cloudId Jira Cloud OAuth (если есть);
  - `x-organization-id` — активная организация из localStorage (`beer-tracker-active-organization-id`, см. [`lib/tenantHttpConstants.ts`](../lib/tenantHttpConstants.ts));
  - `x-realtime-client-id` — id вкладки, чтобы не применять эхо собственных мутаций из realtime;
  - на 401: при наличии refresh-токена Atlassian — обновление и повтор запроса, иначе редирект на `/auth-setup?next=…`.

Образец функции (из `lib/api/sprintGoals.ts`):

```typescript
import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

export async function fetchSprintGoals(sprintId: number, goalType: 'delivery' | 'discovery') {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<SprintGoalsResponse>(
      `/sprint-goals?sprintId=${sprintId}&goalType=${goalType}`
    );
    return data ?? null;
  } catch (error) {
    console.error('Failed to fetch sprint goals:', error);
    return null;
  }
}
```

## Сервер: `app/api/**/route.ts` и `lib/<домен>`

| Задача | Что использовать |
|--------|------------------|
| Tenant и доступ | [`lib/api-tenant.ts`](../lib/api-tenant.ts): `requireTenantContext` (большинство маршрутов планера), `requireTenantForOrganization` / `requireTenantWithPlannerProfile` / `requireOrgAdminForOrganizationRoute` (маршруты с `organizationId` в пути); вход в `/api/*` без сессии закрывает [`proxy.ts`](../proxy.ts), публичные роуты — [`lib/auth/apiAccessGate.ts`](../lib/auth/apiAccessGate.ts) |
| Валидация | Zod-схемы и `validateRequest` / `formatValidationError` из [`lib/validation.ts`](../lib/validation.ts) |
| Ошибки | `handleApiError(error, context)` из [`lib/api-error-handler.ts`](../lib/api-error-handler.ts): 401/429 трекера, `TrackerApiConfigError` (например 422 «трекер не подключён»), неподдерживаемая операция провайдера |
| Трекер (Yandex / Jira) | `getIssueTrackerProviderClientFromRequest(request)` из [`lib/issueTrackerProvider/clientFactory.ts`](../lib/issueTrackerProvider/clientFactory.ts) → `IssueTrackerProviderClient`; для серверных задач по сохранённому токену организации — `getIssueTrackerProviderClientForOrganization(orgId)` |
| Снимки задач | `lib/snapshots/*` (`issue_snapshots`, кэш changelog `issue_changelog_events`) |
| Доменные таблицы | репозитории в `lib/<домен>/` (`lib/sprints/`, `lib/sprintGoals/`, `lib/issues/` …) |
| Realtime после мутации | `notifySprintRealtime(request, organizationId, sprintId, resources)` из [`lib/realtime/notifySprintRealtime.ts`](../lib/realtime/notifySprintRealtime.ts) |

**Токен и URL трекера** резолвятся в [`lib/trackerRequestConfig.ts`](../lib/trackerRequestConfig.ts): тип трекера и URL API — из `organizations.settings.issueTracker`, токен — из `X-Tracker-Token` или из зашифрованного секрета организации. Переменных окружения `TRACKER_API_URL` / `TRACKER_OAUTH_TOKEN` нет. Подробно — раздел «Multi-tenancy и авторизация» в [ARCHITECTURE.md](../ARCHITECTURE.md).

**Легаси:** `getTrackerApiFromRequest` ([`lib/api-tracker.ts`](../lib/api-tracker.ts)) и `createTrackerApiFromRequest` / `createTrackerApiClient` ([`lib/tracker-client.ts`](../lib/tracker-client.ts)) отдают сырой axios к трекеру; `lib/trackerApi/*` — функции Yandex Tracker REST. В новом коде маршрутов их не использовать (см. «Провайдеры трекера» в ARCHITECTURE.md).

**Типы:** формы ответов Yandex Tracker (`SprintInfo`, `TrackerIssue`, `ChecklistItem`, `ChangelogEntry`, `BoardParams` …) — [`types/tracker.ts`](../types/tracker.ts); доменные типы UI (`Task` и др.) — `@/types` ([`types/index.ts`](../types/index.ts)); провайдер-нейтральные типы трекера — `lib/issueTrackerProvider/types.ts`.

Образец маршрута — [`app/api/sprints/[sprintId]/lane-layers/route.ts`](../app/api/sprints/[sprintId]/lane-layers/route.ts): `requireTenantContext` → Zod → репозиторий → `notifySprintRealtime` → `handleApiError`.

## Как добавить эндпоинт

1. **Домен:** SQL — в `lib/<домен>/*Repository.ts`; вызовы трекера — через `IssueTrackerProviderClient` (при нужде нового метода — расширить `lib/issueTrackerProvider/types.ts` и адаптеры Yandex/Jira).
2. **Route:** `app/api/<путь>/route.ts` — tenant, Zod, вызов `lib/<домен>`, `NextResponse`, `handleApiError`; при изменении данных спринта — `notifySprintRealtime`.
3. **Клиент:** функция в `lib/api/<домен>.ts` через `getPlannerBeerTrackerApi()`, тип ответа — там же или в `lib/api/types.ts`.
4. **UI:** хук/компонент импортирует функцию из `lib/api`; серверный кэш — React Query (см. ARCHITECTURE.md).
5. **Документация:** строка в таблице [API_BACKENDS.md](./API_BACKENDS.md).
6. **Проверки:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm lint:unused`.

## Типичные ошибки

| Статус | Причина | Что проверить |
|--------|---------|---------------|
| 401 | Нет cookie сессии продукта или трекер отверг токен | Токен пользователя (`X-Tracker-Token`) или токен организации в админке «Трекер»; клиент сам уводит на `/auth-setup` |
| 403 | Нет членства в организации / недостаточно прав | `x-organization-id`, роль в `organization_members` |
| 422 | Для организации не подключён трекер или нет токена | Админка организации → подключение трекера |
| 429 | Rate limit трекера | Повторить позже |
| 500 | Ошибка в route / домене | Логи сервера: `handleApiError` пишет `[context]` в консоль |
