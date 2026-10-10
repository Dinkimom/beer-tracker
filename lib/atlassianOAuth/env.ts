function getAtlassianOAuthClientId(): string {
  return (process.env.ATLASSIAN_OAUTH_CLIENT_ID ?? '').trim();
}

function getAtlassianOAuthClientSecret(): string {
  return (process.env.ATLASSIAN_OAUTH_CLIENT_SECRET ?? '').trim();
}

export function assertAtlassianOAuthConfigured():
  | { clientId: string; clientSecret: string; ok: true }
  | { error: string; ok: false } {
  const clientId = getAtlassianOAuthClientId();
  const clientSecret = getAtlassianOAuthClientSecret();
  if (!clientId || !clientSecret) {
    return {
      error:
        'Задайте ATLASSIAN_OAUTH_CLIENT_ID и ATLASSIAN_OAUTH_CLIENT_SECRET в окружении сервера.',
      ok: false,
    };
  }
  return { clientId, clientSecret, ok: true };
}
