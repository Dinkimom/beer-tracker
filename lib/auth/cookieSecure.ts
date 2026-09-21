/**
 * Флаг `Secure` для auth-cookies.
 * В production по умолчанию `true` (только HTTPS). На голом HTTP без TLS
 * браузер такую cookie не сохранит — сессия «не логинится».
 * Временный стенд: `AUTH_SESSION_COOKIE_SECURE=false` (см. env.example).
 */
export function resolveAuthCookieSecure(): boolean {
  const raw = process.env.AUTH_SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') {
    return false;
  }
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') {
    return true;
  }
  return process.env.NODE_ENV === 'production';
}
