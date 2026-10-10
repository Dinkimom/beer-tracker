import { ATLASSIAN_AUTHORIZE_URL, ATLASSIAN_OAUTH_SCOPES } from './constants';

export function buildAtlassianAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: input.clientId,
    prompt: 'consent',
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: ATLASSIAN_OAUTH_SCOPES.join(' '),
    state: input.state,
  });
  return `${ATLASSIAN_AUTHORIZE_URL}?${params.toString()}`;
}
