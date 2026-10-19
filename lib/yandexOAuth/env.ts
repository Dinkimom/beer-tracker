/**
 * Runtime-only reads. Bracket access avoids Next.js build-time inlining of
 * `process.env.YANDEX_OAUTH_CLIENT_ID` (empty string from Docker image build).
 */
function readRuntimeEnv(name: 'YANDEX_OAUTH_CLIENT_ID'): string {
  return (process.env[name] ?? '').trim();
}

export function readYandexOauthClientId(): string {
  return readRuntimeEnv('YANDEX_OAUTH_CLIENT_ID');
}

export function assertYandexOauthConfigured():
  | { clientId: string; ok: true }
  | { error: string; ok: false } {
  const clientId = readYandexOauthClientId();
  if (!clientId) {
    return {
      error:
        'Задайте YANDEX_OAUTH_CLIENT_ID в окружении сервера (OAuth ClientID с https://oauth.yandex.ru/).',
      ok: false,
    };
  }
  return { clientId, ok: true };
}
