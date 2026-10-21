import { YANDEX_TOKEN_URL } from './constants';

function tokenErrorMessage(data: Record<string, unknown>, status: number): string {
  if (typeof data.error_description === 'string') {
    return data.error_description;
  }
  if (typeof data.error === 'string') {
    return data.error;
  }
  return `HTTP ${status}`;
}

/** Exchanges the authorization code for a Yandex Tracker access token. */
export async function exchangeYandexAuthorizationCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
}): Promise<string> {
  const res = await fetch(YANDEX_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      grant_type: 'authorization_code',
    }).toString(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Yandex token exchange failed: ${tokenErrorMessage(data, res.status)}`);
  }
  const accessToken = typeof data.access_token === 'string' ? data.access_token.trim() : '';
  if (!accessToken) {
    throw new Error('Yandex token response missing access_token');
  }
  return accessToken;
}
