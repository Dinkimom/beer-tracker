/**
 * Runtime-only reads. Bracket access avoids Next.js build-time inlining of
 * `process.env.ATLASSIAN_OAUTH_*` (empty string from Docker image build).
 */
function readRuntimeEnv(name: 'ATLASSIAN_OAUTH_CLIENT_ID' | 'ATLASSIAN_OAUTH_CLIENT_SECRET'): string {
  return (process.env[name] ?? '').trim();
}

export function assertAtlassianOAuthConfigured():
  | { clientId: string; clientSecret: string; ok: true }
  | { error: string; ok: false } {
  const clientId = readRuntimeEnv('ATLASSIAN_OAUTH_CLIENT_ID');
  const clientSecret = readRuntimeEnv('ATLASSIAN_OAUTH_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return {
      error:
        'Задайте ATLASSIAN_OAUTH_CLIENT_ID и ATLASSIAN_OAUTH_CLIENT_SECRET в окружении сервера.',
      ok: false,
    };
  }
  return { clientId, clientSecret, ok: true };
}
