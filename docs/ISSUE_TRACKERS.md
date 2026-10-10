# Issue trackers (Yandex Tracker и Jira)

Beer Tracker — **надстройка** над внешней системой учёта задач. На один self-hosted инстанс выбирается **один** провайдер; планер, снимки и staff/teams от провайдера не зависят.

## Развилка: куда смотреть

Сначала задайте в `.env` провайдер и URL API (см. [`env.example`](../env.example)), затем идите **только** по своей ветке:

| Если `ISSUE_TRACKER_PROVIDER`… | Смотрите раздел |
|--------------------------------|-----------------|
| `tracker` или `yandex-tracker` | [Ветка A — Яндекс Трекер](#ветка-a--яндекс-трекер) |
| `jira-cloud` | [Ветка B — Jira Cloud](#ветка-b--jira-cloud) |
| `jira-onprem` | [Ветка C — Jira Data Center / Server](#ветка-c--jira-data-center--server) |
| `jira` (алиас) | cloud или on-prem по виду `TRACKER_API_URL` → ветка B или C |

Общее для всех: [Что общее](#что-общее) и [Где настраивать](#где-настраивать).

```bash
# Один из вариантов:
ISSUE_TRACKER_PROVIDER=tracker      # → ветка A
# ISSUE_TRACKER_PROVIDER=jira-cloud # → ветка B
# ISSUE_TRACKER_PROVIDER=jira-onprem # → ветка C
```

Код провайдера: `lib/issueTrackerProvider/` (registry + адаптеры). HTTP-роуты должны ходить в provider-client, а не в Yandex/Jira API напрямую.

---

## Ветка A — Яндекс Трекер

```bash
ISSUE_TRACKER_PROVIDER=tracker
# или алиас: yandex-tracker
TRACKER_API_URL=https://api.tracker.yandex.net/v3
```

### 1. OAuth-приложение Яндекс ID (обязательно для кнопки «получить токен»)

Пользовательский OAuth-токен Tracker выдаётся через **приложение на [oauth.yandex.ru](https://oauth.yandex.ru/)**. Это не «настройка Трекера» и не секрет сервера — публичный **ClientID**.

1. Создайте приложение на https://oauth.yandex.ru/
2. В правах доступа включите **Яндекс Трекер**: `tracker:read` и `tracker:write`
3. Скопируйте **ClientID** в `.env`:

```bash
YANDEX_OAUTH_CLIENT_ID=ваш_client_id
```

Без `YANDEX_OAUTH_CLIENT_ID` ссылка «получить токен» в UI ведёт на authorize с пустым `client_id` и не работает.  
В коде: `YANDEX_OAUTH_CLIENT_ID` в `constants/index.ts` (env пробрасывается в клиент через `next.config.ts`, без префикса `NEXT_PUBLIC_`).

### 2. Организация в админке

- **Cloud Organization ID** (org id Яндекс 360 / Cloud для API Трекера) — в админке организации, не в общем env.
- Опционально серверный fallback-токен: `TRACKER_OAUTH_TOKEN` в `.env`.

### 3. Пользователь

На `/auth-setup` или в настройках: OAuth-токен Яндекс ID (кнопка ведёт на `oauth.yandex.ru/authorize?…&client_id=…&scope=tracker:read+tracker:write`).

---

## Ветка B — Jira Cloud

Два разных канала учётки:

| Кто | Как | Где |
|-----|-----|-----|
| Пользователь | Atlassian OAuth 2.0 (3LO) | `/auth-setup`, `/register` — кнопка **«Продолжить с Atlassian»** / **Continue with Atlassian** |
| Организация | email + API-токен (Basic) | админка «Трекер» — sync, каталог полей, org-вызовы |

```bash
ISSUE_TRACKER_PROVIDER=jira-cloud
TRACKER_API_URL=https://your-site.atlassian.net/rest/api/3
ATLASSIAN_OAUTH_CLIENT_ID=…
ATLASSIAN_OAUTH_CLIENT_SECRET=…
```

- **Не нужен** `YANDEX_OAUTH_CLIENT_ID` — это только для ветки A.

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
   Это **не** Docker build ARG (в отличие от `YANDEX_OAUTH_CLIENT_ID`): пустые значения на сборке образа не мешают, если задать их при запуске.

После «Продолжить с Atlassian»: access + refresh + `cloudId` в браузере (localStorage).  
REST пользователя: `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3` с `Bearer` (заголовок `X-Tracker-Cloud-Id` в запросах к Beer Tracker API).

Роуты: `/api/auth/atlassian/start`, `/api/auth/atlassian/callback`, `/api/auth/atlassian/refresh`.

### 2. Организация в админке

Email Atlassian-аккаунта + **API-токен** (Basic к site `TRACKER_API_URL` на `*.atlassian.net`).  
Это **не** пользовательский OAuth: отдельный секрет для sync и каталога. Help: [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

### 3. `TRACKER_API_URL`

Site REST (`https://your-site.atlassian.net/rest/api/3`) и ссылки `/browse/{key}`. Живые user-вызовы к API идут через `api.atlassian.com` (см. выше).

---

## Ветка C — Jira Data Center / Server

```bash
ISSUE_TRACKER_PROVIDER=jira-onprem
TRACKER_API_URL=https://jira.example.com/rest/api/2
```

- **Не нужен** `YANDEX_OAUTH_CLIENT_ID`.
- Auth: **personal access token (PAT)** в профиле Jira  
  Обычно: `{site}/secure/ViewProfile.jspa` → Personal Access Tokens (точный путь зависит от версии).
- Org-поля подключения — в админке.

---

## Что общее

- Задачи, статусы, спринты/доски живут во внешнем трекере.
- Планер хранит позиции, связи, цели, availability в PostgreSQL.
- Пользовательская учётка — в браузере; в API — `X-Tracker-Token` (+ для Jira Cloud OAuth: `X-Tracker-Cloud-Id`).
- Опциональный серверный fallback-токен в env — README / `env.example`.
- Фоновый sync (`pnpm sync-worker`) пишет `issue_snapshots` для любого провайдера.

## Где настраивать

1. **Инстанс** — `.env`: `ISSUE_TRACKER_PROVIDER`, `TRACKER_API_URL` (+ ветка A: `YANDEX_OAUTH_CLIENT_ID`; ветка B: `ATLASSIAN_OAUTH_*`).
2. **Организация** — админка «Трекер» / integration (ветка B: email + API-токен).
3. **Пользователь** — `/auth-setup` или `/register` (ветка B: OAuth); настройки — правка сохранённого токена в браузере.

Поля env: [`env.example`](../env.example).  
Инженерия адаптеров / контракты Yandex: [ISSUE_TRACKER_PROVIDER_MIGRATION.md](./ISSUE_TRACKER_PROVIDER_MIGRATION.md), [ISSUE_TRACKER_YANDEX_CONTRACT.md](./ISSUE_TRACKER_YANDEX_CONTRACT.md).
