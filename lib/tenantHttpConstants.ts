/**
 * Заголовок активной организации и ключ localStorage (клиент + сервер, без зависимостей от Next).
 */

export const TENANT_ORG_HEADER = 'x-organization-id' as const;

/** Активная org продукта для `beerTrackerApi` → заголовок {@link TENANT_ORG_HEADER}. */
export const PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY =
  'beer-tracker-active-organization-id' as const;
