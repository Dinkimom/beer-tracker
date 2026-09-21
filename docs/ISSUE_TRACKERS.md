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

```bash
ISSUE_TRACKER_PROVIDER=jira-cloud
TRACKER_API_URL=https://your-site.atlassian.net/rest/api/3
```

- **Не нужен** `YANDEX_OAUTH_CLIENT_ID` — это только для ветки A.
- Auth: **email** Atlassian-аккаунта + **API token**  
  Создание токена: https://id.atlassian.com/manage-profile/security/api-tokens
- В UI / заголовках: токен + email (не Yandex OAuth).
- Поля подключения сайта/учётки организации — в админке «Трекер» / integration.

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
- Пользовательская учётка — в браузере; в API — `X-Tracker-Token` (для Jira Cloud ещё email).
- Опциональный серверный fallback-токен в env — README / `env.example`.
- Фоновый sync (`pnpm sync-worker`) пишет `issue_snapshots` для любого провайдера.

## Где настраивать

1. **Инстанс** — `.env`: `ISSUE_TRACKER_PROVIDER`, `TRACKER_API_URL` (+ для ветки A: `YANDEX_OAUTH_CLIENT_ID`).
2. **Организация** — админка «Трекер» / integration.
3. **Пользователь** — `/auth-setup` или настройки.

Поля env: [`env.example`](../env.example).  
Инженерия адаптеров / контракты Yandex: [ISSUE_TRACKER_PROVIDER_MIGRATION.md](./ISSUE_TRACKER_PROVIDER_MIGRATION.md), [ISSUE_TRACKER_YANDEX_CONTRACT.md](./ISSUE_TRACKER_YANDEX_CONTRACT.md).
