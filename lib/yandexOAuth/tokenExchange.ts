import { oauthTokenErrorMessage } from '@/lib/oauthTokenErrorMessage';

import { YANDEX_TOKEN_URL } from './constants';


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
    throw new Error(`Yandex token exchange failed: ${oauthTokenErrorMessage(data, res.status)}`);
  }
  const accessToken = typeof data.access_token === 'string' ? data.access_token.trim() : '';
  if (!accessToken) {
    throw new Error('Yandex token response missing access_token');
  }
  return accessToken;
}
