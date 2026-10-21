import { afterEach, describe, expect, it, vi } from 'vitest';

import { exchangeYandexAuthorizationCode } from './tokenExchange';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const INPUT = { clientId: 'cid', clientSecret: 'secret', code: '1234567' };

describe('exchangeYandexAuthorizationCode', () => {
  it('posts form-encoded code grant and returns access token', async () => {
    const fetchMock = stubFetch(200, { access_token: ' y0_token ', expires_in: 31536000 });
    await expect(exchangeYandexAuthorizationCode(INPUT)).resolves.toBe('y0_token');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth.yandex.ru/token');
    const body = new URLSearchParams(String(init.body));
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('1234567');
    expect(body.get('client_id')).toBe('cid');
    expect(body.get('client_secret')).toBe('secret');
  });

  it('surfaces error_description on failure', async () => {
    stubFetch(400, { error: 'bad_verification_code', error_description: 'Code has expired' });
    await expect(exchangeYandexAuthorizationCode(INPUT)).rejects.toThrow('Code has expired');
  });

  it('fails when access_token is missing', async () => {
    stubFetch(200, {});
    await expect(exchangeYandexAuthorizationCode(INPUT)).rejects.toThrow('access_token');
  });
});
