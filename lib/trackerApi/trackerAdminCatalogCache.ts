import { createHash } from 'node:crypto';

/** TTL кэша очередей/досок для GET tracker-catalog (админка команд). */
export const TRACKER_ADMIN_CATALOG_QUEUES_BOARDS_TTL_SEC = 5 * 60;

/** TTL кэша GET tracker-metadata (поля / статусы). */
export const TRACKER_ADMIN_METADATA_TTL_SEC = 5 * 60;

/**
 * Ключ кэша зависит от учётных данных к Tracker: смена токена, URL API или Cloud Org ID
 * даёт новый fingerprint без ручной инвалидации.
 */
export function trackerAdminCatalogConnectionFingerprint(
  oauthToken: string,
  apiBaseUrl: string,
  trackerCloudOrgId: string
): string {
  return createHash('sha256')
    .update(`${oauthToken}\0${apiBaseUrl}\0${trackerCloudOrgId}`)
    .digest('hex')
    .slice(0, 16);
}
