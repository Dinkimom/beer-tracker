# Единообразие слоёв: бэклог

Цель: границы **UI → `lib/api` → `app/api` routes → `lib/<domain>`** в одном контракте. Волны P1–P4 **закрыты**; документ — канон + история.

Связанные документы: [`AGENTS.md`](../AGENTS.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md) (схема HTTP + React Query / MobX), оставшийся UI-долг — [`REFACTORING_BACKLOG.md`](./REFACTORING_BACKLOG.md).

---

## Целевая схема

```text
features/ / components/ / hooks/
        │
        ▼  только lib/api/*  (getPlannerBeerTrackerApi)
   lib/api/*
        │
        ▼  HTTP /api/...
   app/api/**/route.ts     тонкий: auth, Zod, status, cache
        │
        ▼
   lib/<domain>/           *Repository (SQL) + *RouteHelpers (оркестрация)
```

**Запрещено (ESLint):**

| Что | Правило |
|-----|---------|
| `query` / `pool` в `app/api` | `api/no-direct-db` |
| UI `fetch('/api/...')` | `client/no-raw-api-fetch` |
| UI / `lib` → `@/app/api/**` | `layers/no-app-api-import` |
| UI → `beerTrackerApi` из `@/lib/axios` | `layers/no-app-api-import` |
| `lib/**` → `@/features/**` | `layers/no-features-import` |

---

## Статус волн

| Волна | Состояние |
|-------|-----------|
| SQL из `app/api` → repositories | ✅ |
| P1 — DTO + lib/api/features + ESLint | ✅ |
| P2 — lib ↛ features | ✅ |
| P3 — тонкие helpers → `lib/*` | ✅ |
| P4 — документация | ✅ |

### P1

- [x] Типы score в `lib/`; UI + `lib/api` без `@/app/api`
- [x] `lib/api/features.ts` + `FeaturesPage` → `fetchEpicsList`
- [x] ESLint: no `@/app/api` / no raw `beerTrackerApi` в UI

### P2

- [x] Quarterly / swimlane / points / admin DTO в `lib/`; features — re-export
- [x] ESLint `layers/no-features-import`

### P3

- [x] `app/api/**/*Helpers` → `lib/admin`, `lib/auth`, `lib/issues`, `lib/epics`, `lib/sprints`, `lib/organizations`, `lib/staffTeams`, `lib/http`
- [x] Нет кросс-импортов доменов через `@/app/api/...`
- [x] Новый Tracker-код → `lib/issueTrackerProvider` (легаси `lib/trackerApi` по касанию)

### P4

- [x] Схема route → domain в [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- [x] [`REFACTORING_BACKLOG.md`](./REFACTORING_BACKLOG.md) — только открытый UI/DX-долг
- [x] UI-долг (двойной кэш tasks, shared components, toast) оставлен в бэклоге рефакторинга, не в этом доке

**Последнее обновление:** 2026-07-14
