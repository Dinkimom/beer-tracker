/**
 * Имена событий общей таблицы analytics_events.
 * Новое событие = строка здесь и в allowlist ingest, без миграции БД.
 */
export const ANALYTICS_EVENT = {
  clientSettings: 'client_settings',
  pageView: 'page_view',
  uiClick: 'ui_click',
} as const;

export const ANALYTICS_EVENT_NAMES = [
  ANALYTICS_EVENT.clientSettings,
  ANALYTICS_EVENT.pageView,
  ANALYTICS_EVENT.uiClick,
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

/** Страницы без продуктовой сессии / демо — не слать события. */
export function shouldSkipAnalyticsPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/auth-setup' ||
    pathname.startsWith('/demo')
  );
}
