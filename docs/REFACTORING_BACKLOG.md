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
| Квартальный UI | `features/quarterly-planning-v2/*` (v1 удалён) |

Публичный клиент (`lib/api/index.ts`): `auth`, `admin`, `boards`, `epics`, `features`, `holidays`, `issues`, `onprem`, `organizations`, `quarterly`, `sprintGoals`, `sprints`, `slaBugs`, `stories`, `types` и др.

Новый клиентский модуль: файл в `lib/api/`, `export *` в `index.ts`, вызов через `getPlannerBeerTrackerApi()` — без raw `beerTrackerApi` в UI.

---

## 2. Открытый долг (UI / DX)

### 2.1 Ошибки на клиенте (средний)

Единый toast / обработчик для React Query и мутаций; меньше «тихих» `console.error` без UI (GroomingTab, части load story tasks и т.п.).

### 2.2 Shared UI (средний)

Аудит: [`SHARED_COMPONENTS_AUDIT.md`](./SHARED_COMPONENTS_AUDIT.md) — SearchInput, PointBadge / TeamTag / StatusTag, Input/TextArea, Button secondary.

### 2.3 ESLint-disable (низкий–средний)

- `react-hooks/exhaustive-deps` — пересмотреть зависимости или вынести логику.
- `no-await-in-loop` — явный паттерн батчей с лимитом параллелизма.
- `react-hooks/set-state-in-effect` — где возможно, без setState в эффекте.

### 2.4 Мелочи (низкий)

Общие мапперы задач/позиций; type guards в `lib/api-error-handler.ts`; именованные константы статусов / `batchSize`.

### 2.5 Крупные UI-файлы (по касанию)

`SprintPlanner` и соседние хуки — дробить при touch по правилам `AGENTS.md` (max-lines, consolidation helpers).

---

## 3. Не дублировать здесь

Правила слоёв, gate (`typecheck` / `lint` / `lint:unused` / `test`), консолидация `*Helpers*` — только в [`AGENTS.md`](../AGENTS.md) и [`ARCHITECTURE_UNIFORMITY.md`](./ARCHITECTURE_UNIFORMITY.md).

**Последнее обновление:** 2026-07-14
