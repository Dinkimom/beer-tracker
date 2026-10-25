/**
 * Вход в `/api/*` (`proxy.ts`): без сессии продукта — 401, кроме роутов, которые проверяют
 * доступ сами (вход, OAuth для MCP, cron по секрету, онбординг on-prem до первой сессии).
 * Права в организации проверяют роуты (`requireTenantContext` и т.п.), здесь — только «кто вы».
 */

const PUBLIC_API_PREFIXES = [
  '/api/auth/', // вход, регистрация, выдача сессии
  '/api/oauth/', // OAuth-сервер для MCP-клиентов
  '/api/internal/', // cron и служебные отчёты: SYNC_CRON_SECRET
  '/api/onprem/', // состояние первичной настройки до регистрации
] as const;

/** MCP сам отвечает 401 с `WWW-Authenticate`: по нему клиент находит OAuth. */
const MCP_PATH = '/api/mcp';

/** Роуты, которые принимают Bearer-токен MCP OAuth вместо сессии и проверяют его сами. */
const MCP_BEARER_PATHS = [/^\/api\/sprints\/\d+\/sprint-context$/] as const;

export function isPublicApiPath(pathname: string, hasBearerToken: boolean): boolean {
  if (pathname === MCP_PATH || PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return hasBearerToken && MCP_BEARER_PATHS.some((pattern) => pattern.test(pathname));
}
