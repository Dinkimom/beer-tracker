# Квартальное планирование (v2) — архив кода

**Не продукт.** Экран снят с навигации, новые фичи не делаем. Документ — карта leftover-кода для тех, кто его трогает. Пользовательский контур — планер спринта.

Код (`features/quarterly-planning-v2`, `/api/quarterly-plans/v2`) сохранён. Legacy-v1 удалён.

## Где лежит код

- UI: `features/quarterly-planning-v2/`
- API: `app/api/quarterly-plans/v2/route.ts`
- клиентский слой: `lib/api/quarterly.ts`
- экран: `QuarterlyPlanningV2Page` — ни в одном роуте не смонтирован; файл держится как entry в `knip.json`, чтобы Knip не считал дерево мёртвым
- настройки отображения: вкладка `quarterly-v2` в `components/SettingsModal/tabs/SettingsPlanningTab.tsx` (ключи `beer-tracker-quarterly-v2-*` в `hooks/localStorage/storageKeys.ts`)

## Что осталось в коде (не развивать)

- сетка квартала через эпики и стори;
- фазы стори (`delivery` / `discovery`);
- недельные факт-события и исключение стори;
- метрики спринтов на квартальной сетке.

## Данные и БД

Квартальный план хранится в:

- `quarterly_plans`
- `quarterly_plan_v2_epics`
- `quarterly_plan_v2_story_phases`
- `quarterly_plan_v2_story_events`
- `quarterly_plan_v2_excluded_stories`

Актуальная схема описана в `database/init.sql` и `database/quarterly_plan_v2_tables.sql`.

## API

```text
GET /api/quarterly-plans/v2?boardId=X&year=Y&quarter=Z
PUT /api/quarterly-plans/v2
```

Дополнительный availability API (живой: планер и свимлейн через `lib/api/quarterly.ts` → `features/sprint/hooks/useBoardAvailabilityEvents.ts`):

```text
GET/POST/PATCH/DELETE /api/quarterly-plans/availability/board-events
```

## Полезные файлы

- `features/quarterly-planning-v2/components/QuarterlyPlanningV2Page.tsx`
- `features/quarterly-planning-v2/hooks/useQuarterlyPlanV2.ts`
- `features/quarterly-planning-v2/hooks/useEpicStoriesOccupancyData.ts`
- `features/quarterly-planning-v2/utils/storyPhasesMap.ts`
- `features/quarterly-planning-v2/utils/storyEventsMap.ts`
