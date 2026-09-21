/**
 * ID и slug системной демо-организации из БД (сид init.sql).
 * Единый источник для on-prem (удаление при старте) без зависимости от `lib/demo` в community-сборке.
 *
 * @see database/init.sql
 */
export const DEMO_SYSTEM_ORGANIZATION_ID = 'f0000000-0000-4000-8000-000000000001' as const;

export const DEMO_SYSTEM_ORGANIZATION_SLUG = '__beer_tracker_system_demo__' as const;
