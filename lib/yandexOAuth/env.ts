/**
 * Runtime-only reads. Bracket access avoids Next.js build-time inlining of
 * `process.env.YANDEX_OAUTH_*` (empty string from Docker image build).
 */
function readRuntimeEnv(name: 'YANDEX_OAUTH_CLIENT_ID' | 'YANDEX_OAUTH_CLIENT_SECRET'): string {
  return (process.env[name] ?? '').trim();
}

export function assertYandexOauthConfigured():
  | { clientId: string; clientSecret: string; ok: true }
  | { error: string; ok: false } {
  const clientId = readRuntimeEnv('YANDEX_OAUTH_CLIENT_ID');
  const clientSecret = readRuntimeEnv('YANDEX_OAUTH_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return {
      error:
        'Задайте YANDEX_OAUTH_CLIENT_ID и YANDEX_OAUTH_CLIENT_SECRET в окружении сервера (приложение на https://oauth.yandex.ru/).',
      ok: false,
    };
  }
  return { clientId, clientSecret, ok: true };
}
