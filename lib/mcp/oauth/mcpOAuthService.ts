/**
 * MCP OAuth 2.1 authorization-server operations (no Express).
 */

import type { OrgMemberRole } from '@/lib/organizations/types';

import { randomUUID } from 'crypto';

import { resolveAccessProfile } from '@/lib/access/orgAccess';
import { listAllOrganizationsAdminSummaries } from '@/lib/organizations/organizationRepository';

import {
  MCP_OAUTH_ACCESS_TTL_SEC,
  MCP_OAUTH_CODE_TTL_SEC,
  MCP_OAUTH_REFRESH_TTL_SEC,
  MCP_OAUTH_SCOPE,
} from './constants';
import {
  consumeMcpOAuthCode,
  findMcpOAuthClient,
  findMcpOAuthCodeChallenge,
  findValidMcpOAuthToken,
  insertMcpOAuthClient,
  insertMcpOAuthCode,
  insertMcpOAuthToken,
  revokeMcpOAuthToken,
  type McpOAuthClientRow,
} from './mcpOAuthRepository';
import { mcpResourceUrl } from './metadata';
import { verifyPkceS256 } from './pkce';
import { clientAllowsRedirectUri } from './redirectUri';
import { generateOpaqueToken } from './tokenHash';

export class McpOAuthError extends Error {
  constructor(
    readonly error: string,
    readonly description: string,
    readonly status: number = 400
  ) {
    super(description);
    this.name = 'McpOAuthError';
  }

  toJson() {
    return { error: this.error, error_description: this.description };
  }
}

interface RegisteredClientInfo {
  client_id: string;
  client_id_issued_at: number;
  client_name?: string;
  client_secret?: string;
  client_secret_expires_at?: number;
  client_uri?: string;
  grant_types?: string[];
  redirect_uris: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
}

function clientRowToInfo(row: McpOAuthClientRow): RegisteredClientInfo {
  const meta = row.metadata;
  return {
    client_id: row.clientId,
    client_id_issued_at: row.clientIdIssuedAt,
    redirect_uris: row.redirectUris,
    ...(row.clientSecret ? { client_secret: row.clientSecret } : {}),
    ...(row.clientSecretExpiresAt != null
      ? { client_secret_expires_at: row.clientSecretExpiresAt }
      : {}),
    ...(typeof meta.client_name === 'string' ? { client_name: meta.client_name } : {}),
    ...(typeof meta.client_uri === 'string' ? { client_uri: meta.client_uri } : {}),
    ...(typeof meta.token_endpoint_auth_method === 'string'
      ? { token_endpoint_auth_method: meta.token_endpoint_auth_method }
      : {}),
    ...(typeof meta.scope === 'string' ? { scope: meta.scope } : {}),
    ...(Array.isArray(meta.grant_types)
      ? { grant_types: meta.grant_types.filter((g): g is string => typeof g === 'string') }
      : {}),
    ...(Array.isArray(meta.response_types)
      ? { response_types: meta.response_types.filter((g): g is string => typeof g === 'string') }
      : {}),
  };
}

export async function getRegisteredClient(clientId: string): Promise<RegisteredClientInfo | null> {
  const row = await findMcpOAuthClient(clientId);
  return row ? clientRowToInfo(row) : null;
}

function parseRedirectUris(raw: Record<string, unknown>): string[] {
  const redirectUris = Array.isArray(raw.redirect_uris)
    ? raw.redirect_uris.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : [];
  if (redirectUris.length < 1) {
    throw new McpOAuthError('invalid_client_metadata', 'redirect_uris is required');
  }
  for (const uri of redirectUris) {
    if (!URL.canParse(uri)) {
      throw new McpOAuthError('invalid_client_metadata', `Invalid redirect_uri: ${uri}`);
    }
  }
  return redirectUris;
}

function buildRegistrationMetadata(raw: Record<string, unknown>): {
  authMethod: string;
  metadata: Record<string, unknown>;
} {
  const authMethod =
    typeof raw.token_endpoint_auth_method === 'string'
      ? raw.token_endpoint_auth_method
      : 'none';
  const metadata: Record<string, unknown> = {
    token_endpoint_auth_method: authMethod,
    grant_types: Array.isArray(raw.grant_types)
      ? raw.grant_types
      : ['authorization_code', 'refresh_token'],
    response_types: Array.isArray(raw.response_types) ? raw.response_types : ['code'],
    scope: typeof raw.scope === 'string' ? raw.scope : MCP_OAUTH_SCOPE,
  };
  if (typeof raw.client_name === 'string') {
    metadata.client_name = raw.client_name;
  }
  if (typeof raw.client_uri === 'string') {
    metadata.client_uri = raw.client_uri;
  }
  return { authMethod, metadata };
}

export async function registerMcpOAuthClient(body: unknown): Promise<RegisteredClientInfo> {
  if (!body || typeof body !== 'object') {
    throw new McpOAuthError('invalid_client_metadata', 'Request body must be a JSON object');
  }
  const raw = body as Record<string, unknown>;
  const redirectUris = parseRedirectUris(raw);
  const { authMethod, metadata } = buildRegistrationMetadata(raw);
  const isPublic = authMethod === 'none';
  const clientId = randomUUID();
  const clientIdIssuedAt = Math.floor(Date.now() / 1000);
  const clientSecret = isPublic ? undefined : generateOpaqueToken();
  const clientSecretExpiresAt = isPublic ? undefined : clientIdIssuedAt + 30 * 24 * 60 * 60;

  const row = await insertMcpOAuthClient({
    clientId,
    clientIdIssuedAt,
    clientSecret,
    clientSecretExpiresAt,
    metadata,
    redirectUris,
  });
  return clientRowToInfo(row);
}

export async function resolveMcpOAuthSubject(userId: string): Promise<{
  organizationId: string;
  role: OrgMemberRole;
}> {
  const organizationId =
    (await listAllOrganizationsAdminSummaries())[0]?.organization_id ?? null;
  if (!organizationId) {
    throw new McpOAuthError('server_error', 'Organization not found', 503);
  }
  const profile = await resolveAccessProfile(userId, organizationId);
  if (profile) {
    return { organizationId, role: profile.orgRole };
  }
  // On-prem: logged-in user without membership row still gets org access.
  return { organizationId, role: 'org_admin' };
}

export async function issueAuthorizationCode(input: {
  clientId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  organizationId: string;
  redirectUri: string;
  resource: string | null;
  scopes: string[];
  userId: string;
}): Promise<string> {
  if (input.codeChallengeMethod !== 'S256') {
    throw new McpOAuthError('invalid_request', 'Only S256 code_challenge_method is supported');
  }
  const client = await findMcpOAuthClient(input.clientId);
  if (!client) {
    throw new McpOAuthError('invalid_client', 'Unknown client_id');
  }
  if (!clientAllowsRedirectUri(client.redirectUris, input.redirectUri)) {
    throw new McpOAuthError('invalid_request', 'redirect_uri is not registered');
  }
  const code = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + MCP_OAUTH_CODE_TTL_SEC * 1000);
  await insertMcpOAuthCode({
    code,
    clientId: input.clientId,
    codeChallenge: input.codeChallenge,
    expiresAt,
    organizationId: input.organizationId,
    redirectUri: input.redirectUri,
    resource: input.resource,
    scopes: input.scopes.length > 0 ? input.scopes : [MCP_OAUTH_SCOPE],
    userId: input.userId,
  });
  return code;
}

function assertClientSecret(client: McpOAuthClientRow, providedSecret: string | null): void {
  if (!client.clientSecret) {
    return;
  }
  if (!providedSecret || providedSecret !== client.clientSecret) {
    throw new McpOAuthError('invalid_client', 'Invalid client credentials', 401);
  }
  if (
    client.clientSecretExpiresAt != null &&
    client.clientSecretExpiresAt > 0 &&
    client.clientSecretExpiresAt < Math.floor(Date.now() / 1000)
  ) {
    throw new McpOAuthError('invalid_client', 'Client secret expired', 401);
  }
}

function resourceMatches(expected: string | null, requested: string | undefined, origin: string): boolean {
  if (!requested) {
    return true;
  }
  const canonical = expected ?? mcpResourceUrl(origin);
  return requested === canonical || requested === expected;
}

export async function exchangeAuthorizationCode(input: {
  clientId: string;
  clientSecret: string | null;
  code: string;
  codeVerifier: string;
  origin: string;
  redirectUri?: string;
  resource?: string;
}): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: 'Bearer';
}> {
  const client = await findMcpOAuthClient(input.clientId);
  if (!client) {
    throw new McpOAuthError('invalid_client', 'Unknown client_id', 401);
  }
  assertClientSecret(client, input.clientSecret);

  const challenge = await findMcpOAuthCodeChallenge(input.code);
  if (!challenge) {
    throw new McpOAuthError('invalid_grant', 'Invalid or expired authorization code');
  }
  if (!verifyPkceS256(input.codeVerifier, challenge)) {
    throw new McpOAuthError('invalid_grant', 'code_verifier does not match the challenge');
  }

  const codeRow = await consumeMcpOAuthCode(input.code);
  if (!codeRow) {
    throw new McpOAuthError('invalid_grant', 'Invalid or expired authorization code');
  }
  if (codeRow.clientId !== input.clientId) {
    throw new McpOAuthError('invalid_grant', 'Authorization code was not issued to this client');
  }
  if (input.redirectUri && input.redirectUri !== codeRow.redirectUri) {
    throw new McpOAuthError('invalid_grant', 'redirect_uri mismatch');
  }
  if (!resourceMatches(codeRow.resource, input.resource, input.origin)) {
    throw new McpOAuthError('invalid_grant', 'resource mismatch');
  }

  return mintTokenPair({
    clientId: codeRow.clientId,
    organizationId: codeRow.organizationId,
    resource: codeRow.resource ?? mcpResourceUrl(input.origin),
    scopes: codeRow.scopes,
    userId: codeRow.userId,
  });
}

export async function exchangeRefreshToken(input: {
  clientId: string;
  clientSecret: string | null;
  origin: string;
  refreshToken: string;
  resource?: string;
  scopes?: string[];
}): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: 'Bearer';
}> {
  const client = await findMcpOAuthClient(input.clientId);
  if (!client) {
    throw new McpOAuthError('invalid_client', 'Unknown client_id', 401);
  }
  assertClientSecret(client, input.clientSecret);

  const row = await findValidMcpOAuthToken(input.refreshToken, 'refresh');
  if (!row || row.clientId !== input.clientId) {
    throw new McpOAuthError('invalid_grant', 'Invalid refresh token');
  }
  if (!resourceMatches(row.resource, input.resource, input.origin)) {
    throw new McpOAuthError('invalid_grant', 'resource mismatch');
  }

  await revokeMcpOAuthToken(input.refreshToken);

  const scopes =
    input.scopes && input.scopes.length > 0
      ? input.scopes.filter((s) => row.scopes.includes(s))
      : row.scopes;

  return mintTokenPair({
    clientId: row.clientId,
    organizationId: row.organizationId,
    resource: row.resource ?? mcpResourceUrl(input.origin),
    scopes: scopes.length > 0 ? scopes : [MCP_OAUTH_SCOPE],
    userId: row.userId,
  });
}

async function mintTokenPair(input: {
  clientId: string;
  organizationId: string;
  resource: string;
  scopes: string[];
  userId: string;
}) {
  const accessToken = generateOpaqueToken();
  const refreshToken = generateOpaqueToken();
  const accessExpires = new Date(Date.now() + MCP_OAUTH_ACCESS_TTL_SEC * 1000);
  const refreshExpires = new Date(Date.now() + MCP_OAUTH_REFRESH_TTL_SEC * 1000);

  await insertMcpOAuthToken({
    token: accessToken,
    tokenType: 'access',
    clientId: input.clientId,
    expiresAt: accessExpires,
    organizationId: input.organizationId,
    resource: input.resource,
    scopes: input.scopes,
    userId: input.userId,
  });
  await insertMcpOAuthToken({
    token: refreshToken,
    tokenType: 'refresh',
    clientId: input.clientId,
    expiresAt: refreshExpires,
    organizationId: input.organizationId,
    resource: input.resource,
    scopes: input.scopes,
    userId: input.userId,
  });

  return {
    access_token: accessToken,
    expires_in: MCP_OAUTH_ACCESS_TTL_SEC,
    refresh_token: refreshToken,
    scope: input.scopes.join(' '),
    token_type: 'Bearer' as const,
  };
}

export async function revokeToken(input: {
  clientId: string;
  clientSecret: string | null;
  token: string;
}): Promise<void> {
  const client = await findMcpOAuthClient(input.clientId);
  if (!client) {
    throw new McpOAuthError('invalid_client', 'Unknown client_id', 401);
  }
  assertClientSecret(client, input.clientSecret);
  await revokeMcpOAuthToken(input.token);
}

interface VerifiedMcpAccessToken {
  clientId: string;
  expiresAt: number;
  organizationId: string;
  resource: string | null;
  scopes: string[];
  userId: string;
}

export async function verifyMcpAccessToken(token: string): Promise<VerifiedMcpAccessToken | null> {
  if (!token) {
    return null;
  }
  const row = await findValidMcpOAuthToken(token, 'access');
  if (!row) {
    return null;
  }
  if (!row.scopes.includes(MCP_OAUTH_SCOPE)) {
    return null;
  }
  return {
    clientId: row.clientId,
    expiresAt: Math.floor(row.expiresAt.getTime() / 1000),
    organizationId: row.organizationId,
    resource: row.resource,
    scopes: row.scopes,
    userId: row.userId,
  };
}
