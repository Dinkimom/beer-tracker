import { NextResponse } from 'next/server';

import { requestOriginFromRequest } from '@/lib/atlassianOAuth/requestOrigin';
import { getProductUserIdFromRequest } from '@/lib/auth/productSession';

import { MCP_OAUTH_SCOPE } from './constants';
import {
  getRegisteredClient,
  issueAuthorizationCode,
  McpOAuthError,
  resolveMcpOAuthSubject,
} from './mcpOAuthService';
import { mcpResourceUrl } from './metadata';
import { clientAllowsRedirectUri } from './redirectUri';

interface AuthorizeQuery {
  clientId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  resource: string | null;
  scope: string;
  state: string | null;
}

export function parseAuthorizeQuery(url: URL): AuthorizeQuery {
  return {
    clientId: url.searchParams.get('client_id')?.trim() ?? '',
    codeChallenge: url.searchParams.get('code_challenge')?.trim() ?? '',
    codeChallengeMethod: url.searchParams.get('code_challenge_method')?.trim() ?? 'S256',
    redirectUri: url.searchParams.get('redirect_uri')?.trim() ?? '',
    resource: url.searchParams.get('resource')?.trim() || null,
    scope: url.searchParams.get('scope')?.trim() || MCP_OAUTH_SCOPE,
    state: url.searchParams.get('state'),
  };
}

export function authorizeParamsFromBody(body: Record<string, string>): AuthorizeQuery {
  return {
    clientId: body.client_id?.trim() ?? '',
    codeChallenge: body.code_challenge?.trim() ?? '',
    codeChallengeMethod: body.code_challenge_method?.trim() ?? 'S256',
    redirectUri: body.redirect_uri?.trim() ?? '',
    resource: body.resource?.trim() || null,
    scope: body.scope?.trim() || MCP_OAUTH_SCOPE,
    state: body.state ?? null,
  };
}

/**
 * Always 303 See Other so a POST consent form becomes a GET at the client
 * callback (Cursor listens for GET on localhost:8787/callback; 307 keeps POST → 404).
 */
function redirectGet(url: string): NextResponse {
  return NextResponse.redirect(url, 303);
}

function redirectWithOAuthError(
  redirectUri: string,
  error: string,
  description: string,
  state: string | null
): NextResponse {
  const target = new URL(redirectUri);
  target.searchParams.set('error', error);
  target.searchParams.set('error_description', description);
  if (state) {
    target.searchParams.set('state', state);
  }
  return redirectGet(target.toString());
}

export async function validateAuthorizeRequest(params: AuthorizeQuery): Promise<{
  clientName: string;
  redirectUri: string;
  resource: string | null;
  scopes: string[];
}> {
  if (!params.clientId || !params.redirectUri || !params.codeChallenge) {
    throw new McpOAuthError(
      'invalid_request',
      'client_id, redirect_uri, and code_challenge are required'
    );
  }
  const client = await getRegisteredClient(params.clientId);
  if (!client) {
    throw new McpOAuthError('invalid_client', 'Unknown client_id');
  }
  if (!clientAllowsRedirectUri(client.redirect_uris, params.redirectUri)) {
    throw new McpOAuthError('invalid_request', 'redirect_uri is not registered');
  }
  if (params.codeChallengeMethod !== 'S256') {
    throw new McpOAuthError('invalid_request', 'Only S256 is supported');
  }
  const scopes = params.scope.split(/\s+/).filter(Boolean);
  if (scopes.length > 0 && !scopes.includes(MCP_OAUTH_SCOPE)) {
    throw new McpOAuthError('invalid_scope', `Supported scope: ${MCP_OAUTH_SCOPE}`);
  }
  return {
    clientName: client.client_name ?? params.clientId,
    redirectUri: params.redirectUri,
    resource: params.resource,
    scopes: scopes.length > 0 ? scopes : [MCP_OAUTH_SCOPE],
  };
}

function buildAuthorizeUrl(origin: string, params: AuthorizeQuery): URL {
  const authorizeUrl = new URL(`${origin}/api/oauth/authorize`);
  const entries: Record<string, string> = {
    client_id: params.clientId,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: params.scope,
  };
  if (params.resource) {
    entries.resource = params.resource;
  }
  if (params.state) {
    entries.state = params.state;
  }
  for (const [key, value] of Object.entries(entries)) {
    authorizeUrl.searchParams.set(key, value);
  }
  return authorizeUrl;
}

function tryValidateOrRedirectError(
  params: AuthorizeQuery,
  error: unknown
): NextResponse | null {
  if (!(error instanceof McpOAuthError) || !params.redirectUri) {
    return null;
  }
  try {
    return redirectWithOAuthError(
      params.redirectUri,
      error.error,
      error.description,
      params.state
    );
  } catch {
    return null;
  }
}

async function issueCodeAndRedirect(input: {
  origin: string;
  params: AuthorizeQuery;
  scopes: string[];
  userId: string;
  validatedRedirectUri: string;
}): Promise<NextResponse> {
  const expectedResource = mcpResourceUrl(input.origin);
  const resource = input.params.resource ?? expectedResource;
  if (resource !== expectedResource) {
    return redirectWithOAuthError(
      input.validatedRedirectUri,
      'invalid_target',
      'resource must be the MCP endpoint URL',
      input.params.state
    );
  }

  const subject = await resolveMcpOAuthSubject(input.userId);
  const code = await issueAuthorizationCode({
    clientId: input.params.clientId,
    codeChallenge: input.params.codeChallenge,
    codeChallengeMethod: input.params.codeChallengeMethod,
    organizationId: subject.organizationId,
    redirectUri: input.validatedRedirectUri,
    resource,
    scopes: input.scopes,
    userId: input.userId,
  });

  const target = new URL(input.validatedRedirectUri);
  target.searchParams.set('code', code);
  if (input.params.state) {
    target.searchParams.set('state', input.params.state);
  }
  target.searchParams.set('iss', input.origin.replace(/\/$/, ''));
  return redirectGet(target.toString());
}

export async function handleAuthorizeFlow(input: {
  decision: 'approve' | 'deny' | 'pending';
  params: AuthorizeQuery;
  request: Request;
}): Promise<NextResponse> {
  const { params, request, decision } = input;
  let validated: Awaited<ReturnType<typeof validateAuthorizeRequest>>;
  try {
    validated = await validateAuthorizeRequest(params);
  } catch (error) {
    const redirected = tryValidateOrRedirectError(params, error);
    if (redirected) {
      return redirected;
    }
    throw error;
  }

  if (decision === 'deny') {
    return redirectWithOAuthError(
      validated.redirectUri,
      'access_denied',
      'The user denied the request',
      params.state
    );
  }

  const origin = requestOriginFromRequest(request);
  const authorizeUrl = buildAuthorizeUrl(origin, params);
  const userId = getProductUserIdFromRequest(request);

  if (!userId) {
    const login = new URL(`${origin}/auth-setup`);
    login.searchParams.set('next', `${authorizeUrl.pathname}${authorizeUrl.search}`);
    return redirectGet(login.toString());
  }

  if (decision === 'pending') {
    const consent = new URL(`${origin}/mcp/oauth/consent`);
    consent.search = authorizeUrl.searchParams.toString();
    return redirectGet(consent.toString());
  }

  return issueCodeAndRedirect({
    origin,
    params,
    scopes: validated.scopes,
    userId,
    validatedRedirectUri: validated.redirectUri,
  });
}
