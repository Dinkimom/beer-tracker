import { createHash } from 'node:crypto';

/**
 * TTL каталога проектов/очередей/досок и полей/статусов Tracker/Jira.
 *
 * Оценка:
 * - частота изменений: новый проект/кастомное поле — часы–дни, не минуты;
 * - стоимость miss: GET /field, /project, list boards — секунды и rate limits;
 * - стоимость stale: селекты в админке/планере без нового поля до явного refresh;
 * - смягчение: `?refresh=1` с кнопки перезагрузки в админке сбрасывает кэш сразу.
 *
 * Берём 30 мин: amortize дорогие upstream-вызовы и даём автоподхват без клика
 * быстрее, чем у workflow (1 ч), ближе к TTL аватаров staff (30 мин).
 */
export const TRACKER_ADMIN_CATALOG_TTL_SEC = 30 * 60;

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

export function isTrackerAdminCatalogRefreshParam(value: string | null): boolean {
  return value === '1' || value === 'true';
}
