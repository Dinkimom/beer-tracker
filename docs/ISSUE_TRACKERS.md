# Issue trackers (Yandex Tracker и Jira)

Beer Tracker — **надстройка** над внешней системой учёта задач. Провайдер выбирается **на организацию** и хранится в БД (`organizations.settings.issueTracker`: `provider` + `apiUrl`); планер, снимки и staff/teams от провайдера не зависят.

## Развилка: куда смотреть

Тип трекера и URL API выбираются при онбординге (`/register`) и меняются в админке «Трекер» без перезапуска. После первой синхронизации тип трекера зафиксирован. Дальше идите **только** по своей ветке:

| Тип трекера | Смотрите раздел |
|-------------|-----------------|
| Яндекс Трекер (`tracker`) | [Ветка A — Яндекс Трекер](#ветка-a--яндекс-трекер) |
| Jira Cloud (`jira-cloud`) | [Ветка B — Jira Cloud](#ветка-b--jira-cloud) |
| Jira Data Center / Server (`jira-onprem`) | [Ветка C — Jira Data Center / Server](#ветка-c--jira-data-center--server) |

Общее для всех: [Что общее](#что-общее) и [Где настраивать](#где-настраивать).

Обновление инстанса, где трекер был задан в env: один раз перенесите прежние значения в БД.

```bash
./scripts/db/psql-with-schema.sh -d beer_tracker \
  -v provider=jira-onprem -v api_url=https://jira.example.com/rest/api/2 \
  -f database/legacy/add-organization-issue-tracker-settings.sql
```

Без миграции организации на Jira и организации без сохранённого трекера считаются неподключёнными, пока админ не сохранит трекер в админке.

Код провайдера: `lib/issueTrackerProvider/` (registry + адаптеры). HTTP-роуты должны ходить в provider-client, а не в Yandex/Jira API напрямую.

---

## Ветка A — Яндекс Трекер

URL API необязателен: по умолчанию `https://api.tracker.yandex.net/v3`.

### 1. OAuth-приложение Яндекс ID (обязательно)

Пользователи входят кнопкой **«Войти с Яндекс ID»** (OAuth 2.0 authorization code). Нужно **приложение на [oauth.yandex.ru](https://oauth.yandex.ru/)**.

1. Создайте веб-приложение на https://oauth.yandex.ru/
2. В правах доступа включите **Яндекс Трекер**: `tracker:read` и `tracker:write`
3. Redirect URI — оба:
   - `{your-origin}/api/auth/yandex/callback` — вход пользователей (должен совпадать точно, с учётом схемы и хоста за прокси);
   - `https://oauth.yandex.ru/verification_code` — ссылка «получить токен» в админке (токен организации для синхронизации).
4. Скопируйте **ClientID** и **Client secret** в `.env`:

```bash
YANDEX_OAUTH_CLIENT_ID=ваш_client_id
YANDEX_OAUTH_CLIENT_SECRET=ваш_client_secret
```

Это **runtime** env контейнера app (не Docker build ARG): задайте в `.env` / secrets и перезапустите. Без них `/api/auth/yandex/start` и `/api/auth/yandex/authorize` отвечают 503, и вход через Яндекс ID не работает.  
В коде: `lib/yandexOAuth/` + роуты `/api/auth/yandex/start`, `/api/auth/yandex/callback` (обмен кода на токен на сервере, секрет не попадает в браузер) и `/api/auth/yandex/authorize` (implicit flow для ссылки в админке).

### 2. Организация в админке

- **Cloud Organization ID** (org id Яндекс 360 / Cloud для API Трекера) и OAuth-токен организации — в админке «Трекер», не в env. Токен для синхронизации вставляется вручную (как API-токен у Jira); ссылка «получить токен» ведёт на `/api/auth/yandex/authorize` → Яндекс показывает токен для копирования. Токен хранится в БД в зашифрованном виде.
- На `/register` токен организации берётся из входа администратора через Яндекс ID.

### 3. Пользователь

На `/auth-setup` — кнопка «Войти с Яндекс ID»: `/api/auth/yandex/start` → `oauth.yandex.ru/authorize?response_type=code…` → `/api/auth/yandex/callback` (обмен кода) → `/auth-setup#yandex_oauth=…` → автовход. В настройках, вкладка трекера — та же кнопка для переподключения. Ручной вставки пользовательского токена нет.

---

## Ветка B — Jira Cloud

Два разных канала учётки:

| Кто | Как | Где |
|-----|-----|-----|
| Пользователь | Atlassian OAuth 2.0 (3LO) | `/auth-setup`, `/register` — кнопка **«Продолжить с Atlassian»** / **Continue with Atlassian** |
| Организация | email + API-токен (Basic) | админка «Трекер» — sync, каталог полей, org-вызовы |

URL API в настройках организации: `https://your-site.atlassian.net/rest/api/3`.

```bash
ATLASSIAN_OAUTH_CLIENT_ID=…
ATLASSIAN_OAUTH_CLIENT_SECRET=…
```

- **Не нужны** `YANDEX_OAUTH_*` — это только для ветки A.

### 1. OAuth-приложение Atlassian (пользовательский вход)

1. Создайте OAuth-приложение в [Developer Console](https://developer.atlassian.com/console/).
2. Authorization → OAuth 2.0 (3LO): callback `{origin}/api/auth/atlassian/callback` (точно, с origin инстанса).
3. Permissions → Jira API (classic): `read:jira-work`, `write:jira-work`, `read:jira-user` + `offline_access`;
   Jira Software (granular, иначе Agile 401): `read:board-scope:jira-software`, `write:board-scope:jira-software`,
   `read:board-scope.admin:jira-software`, `read:sprint:jira-software`, `write:sprint:jira-software`,
   `read:epic:jira-software`, `write:epic:jira-software`, `read:issue:jira-software`, `write:issue:jira-software`,
   `read:project:jira`.
   Тот же набор задан в коде: `lib/atlassianOAuth/constants.ts` (`ATLASSIAN_OAUTH_SCOPES`).
4. Client ID / Secret → runtime `.env` / secrets контейнера (`ATLASSIAN_OAUTH_*`), затем рестарт app.
   Это **не** Docker build ARG (как и `YANDEX_OAUTH_*`): пустые значения на сборке образа не мешают, если задать их при запуске.

После «Продолжить с Atlassian»: access + refresh + `cloudId` в браузере (localStorage).  
REST пользователя: `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3` с `Bearer` (заголовок `X-Tracker-Cloud-Id` в запросах к Beer Tracker API).

Роуты: `/api/auth/atlassian/start`, `/api/auth/atlassian/callback`, `/api/auth/atlassian/refresh`.

### 2. Организация в админке

Email Atlassian-аккаунта + **API-токен** (Basic к site из URL API организации на `*.atlassian.net`).  
Это **не** пользовательский OAuth: отдельный секрет для sync и каталога. Help: [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

### 3. URL API

Site REST (`https://your-site.atlassian.net/rest/api/3`) и ссылки `/browse/{key}`. Живые user-вызовы к API идут через `api.atlassian.com` (см. выше).

---

## Ветка C — Jira Data Center / Server

URL API в настройках организации: `https://jira.example.com/rest/api/2`.

- **Не нужны** `YANDEX_OAUTH_*`.
- Auth: **personal access token (PAT)** в профиле Jira  
  Обычно: `{site}/secure/ViewProfile.jspa` → Personal Access Tokens (точный путь зависит от версии).
- Org-поля подключения — в админке.

---

## Что общее

- Задачи, статусы, спринты/доски живут во внешнем трекере.
- Планер хранит позиции, связи, цели, availability в PostgreSQL.
- Пользовательская учётка — в браузере; в API — `X-Tracker-Token` (+ для Jira Cloud OAuth: `X-Tracker-Cloud-Id`).
- Токен организации для синхронизации и каталога — в админке «Трекер», в БД, не в env.
- Фоновый sync (`pnpm sync-worker`) пишет `issue_snapshots` для любого провайдера.

## Где настраивать

1. **Инстанс** — `.env`: только OAuth-приложения (ветка A: `YANDEX_OAUTH_*`; ветка B: `ATLASSIAN_OAUTH_*`).
2. **Организация** — `/register` и админка «Трекер»: тип трекера, URL API, учётка (ветка B: email + API-токен).
3. **Пользователь** — `/auth-setup` или `/register` (ветки A и B: OAuth; у B вкладка токена в настройках скрыта, у A там кнопка переподключения Яндекс ID). Для Jira on-prem — также вкладка трекера в настройках.

Поля env: [`env.example`](../env.example).  
Инженерия адаптеров / контракты Yandex: [ISSUE_TRACKER_PROVIDER_MIGRATION.md](./ISSUE_TRACKER_PROVIDER_MIGRATION.md), [ISSUE_TRACKER_YANDEX_CONTRACT.md](./ISSUE_TRACKER_YANDEX_CONTRACT.md).
