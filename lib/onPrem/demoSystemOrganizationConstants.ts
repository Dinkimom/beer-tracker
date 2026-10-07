/**
 * ID и slug системной демо-организации из старого сида init.sql.
 * Свежая схема её больше не создаёт. Константы нужны, чтобы вычистить уже попавшую строку
 * и не считать её организацией клиента при онбординге.
 */
export const DEMO_SYSTEM_ORGANIZATION_ID = 'f0000000-0000-4000-8000-000000000001' as const;

export const DEMO_SYSTEM_ORGANIZATION_SLUG = '__beer_tracker_system_demo__' as const;

/** Предикат «это не демо-организация». Имена колонок задаёт вызывающий запрос. */
export function sqlExcludingDemoSystemOrganization(
  idColumn = 'id',
  slugColumn = 'slug'
): string {
  return `${idColumn} <> '${DEMO_SYSTEM_ORGANIZATION_ID}'::uuid AND ${slugColumn} IS DISTINCT FROM '${DEMO_SYSTEM_ORGANIZATION_SLUG}'`;
}
