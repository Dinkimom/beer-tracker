/**
 * Postgres storage for MCP OAuth clients, authorization codes, and tokens.
 */

import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';

import { hashOpaqueToken } from './tokenHash';

let tablesEnsured = false;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

export interface McpOAuthClientRow {
  clientId: string;
  clientIdIssuedAt: number;
  clientSecret: string | null;
  clientSecretExpiresAt: number | null;
  metadata: Record<string, unknown>;
  redirectUris: string[];
}

interface McpOAuthCodeRow {
  clientId: string;
  codeChallenge: string;
  organizationId: string;
  redirectUri: string;
  resource: string | null;
  scopes: string[];
  userId: string;
}

interface McpOAuthTokenRow {
  clientId: string;
  expiresAt: Date;
  organizationId: string;
  resource: string | null;
  revokedAt: Date | null;
  scopes: string[];
  tokenType: 'access' | 'refresh';
  userId: string;
}

async function ensureMcpOAuthTables(): Promise<void> {
  if (tablesEnsured) {
    return;
  }
  const schema = qualifySchemaName(getBeerTrackerSchema());
  await query(`
    CREATE TABLE IF NOT EXISTS ${schema}.mcp_oauth_clients (
      client_id TEXT PRIMARY KEY,
      client_id_issued_at BIGINT NOT NULL,
      client_secret TEXT,
      client_secret_expires_at BIGINT,
      redirect_uris JSONB NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS ${schema}.mcp_oauth_codes (
      code_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES ${schema}.mcp_oauth_clients (client_id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      organization_id UUID NOT NULL,
      code_challenge TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      resource TEXT,
      scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS ${schema}.mcp_oauth_tokens (
      token_hash TEXT PRIMARY KEY,
      token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh')),
      client_id TEXT NOT NULL REFERENCES ${schema}.mcp_oauth_clients (client_id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      organization_id UUID NOT NULL,
      scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
      resource TEXT,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      revoked_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesEnsured = true;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function insertMcpOAuthClient(input: {
  clientId: string;
  clientIdIssuedAt: number;
  clientSecret?: string;
  clientSecretExpiresAt?: number;
  metadata: Record<string, unknown>;
  redirectUris: string[];
}): Promise<McpOAuthClientRow> {
  await ensureMcpOAuthTables();
  await query(
    `INSERT INTO mcp_oauth_clients (
      client_id, client_id_issued_at, client_secret, client_secret_expires_at, redirect_uris, metadata
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      input.clientId,
      input.clientIdIssuedAt,
      input.clientSecret ?? null,
      input.clientSecretExpiresAt ?? null,
      JSON.stringify(input.redirectUris),
      JSON.stringify(input.metadata),
    ]
  );
  return {
    clientId: input.clientId,
    clientIdIssuedAt: input.clientIdIssuedAt,
    clientSecret: input.clientSecret ?? null,
    clientSecretExpiresAt: input.clientSecretExpiresAt ?? null,
    redirectUris: input.redirectUris,
    metadata: input.metadata,
  };
}

export async function findMcpOAuthClient(clientId: string): Promise<McpOAuthClientRow | null> {
  await ensureMcpOAuthTables();
  const res = await query<{
    client_id: string;
    client_id_issued_at: string;
    client_secret: string | null;
    client_secret_expires_at: string | null;
    metadata: unknown;
    redirect_uris: unknown;
  }>(
    `SELECT client_id, client_id_issued_at, client_secret, client_secret_expires_at, redirect_uris, metadata
     FROM mcp_oauth_clients WHERE client_id = $1`,
    [clientId]
  );
  const row = res.rows[0];
  if (!row) {
    return null;
  }
  return {
    clientId: row.client_id,
    clientIdIssuedAt: Number(row.client_id_issued_at),
    clientSecret: row.client_secret,
    clientSecretExpiresAt:
      row.client_secret_expires_at == null ? null : Number(row.client_secret_expires_at),
    redirectUris: parseStringArray(row.redirect_uris),
    metadata: parseMetadata(row.metadata),
  };
}

export async function insertMcpOAuthCode(input: {
  code: string;
  clientId: string;
  codeChallenge: string;
  expiresAt: Date;
  organizationId: string;
  redirectUri: string;
  resource: string | null;
  scopes: string[];
  userId: string;
}): Promise<void> {
  await ensureMcpOAuthTables();
  await query(
    `INSERT INTO mcp_oauth_codes (
      code_hash, client_id, user_id, organization_id, code_challenge, redirect_uri, resource, scopes, expires_at
    ) VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8::jsonb, $9)`,
    [
      hashOpaqueToken(input.code),
      input.clientId,
      input.userId,
      input.organizationId,
      input.codeChallenge,
      input.redirectUri,
      input.resource,
      JSON.stringify(input.scopes),
      input.expiresAt,
    ]
  );
}

/** Consume (delete) an authorization code; returns row if valid and not expired. */
export async function consumeMcpOAuthCode(code: string): Promise<McpOAuthCodeRow | null> {
  await ensureMcpOAuthTables();
  const codeHash = hashOpaqueToken(code);
  const res = await query<{
    client_id: string;
    code_challenge: string;
    expires_at: Date;
    organization_id: string;
    redirect_uri: string;
    resource: string | null;
    scopes: unknown;
    user_id: string;
  }>(
    `DELETE FROM mcp_oauth_codes
     WHERE code_hash = $1 AND expires_at > NOW()
     RETURNING client_id, user_id, organization_id, code_challenge, redirect_uri, resource, scopes, expires_at`,
    [codeHash]
  );
  const row = res.rows[0];
  if (!row) {
    return null;
  }
  return {
    clientId: row.client_id,
    codeChallenge: row.code_challenge,
    organizationId: row.organization_id,
    redirectUri: row.redirect_uri,
    resource: row.resource,
    scopes: parseStringArray(row.scopes),
    userId: row.user_id,
  };
}

export async function findMcpOAuthCodeChallenge(code: string): Promise<string | null> {
  await ensureMcpOAuthTables();
  const res = await query<{ code_challenge: string }>(
    `SELECT code_challenge FROM mcp_oauth_codes
     WHERE code_hash = $1 AND expires_at > NOW()`,
    [hashOpaqueToken(code)]
  );
  return res.rows[0]?.code_challenge ?? null;
}

export async function insertMcpOAuthToken(input: {
  token: string;
  tokenType: 'access' | 'refresh';
  clientId: string;
  expiresAt: Date;
  organizationId: string;
  resource: string | null;
  scopes: string[];
  userId: string;
}): Promise<void> {
  await ensureMcpOAuthTables();
  await query(
    `INSERT INTO mcp_oauth_tokens (
      token_hash, token_type, client_id, user_id, organization_id, scopes, resource, expires_at
    ) VALUES ($1, $2, $3, $4, $5::uuid, $6::jsonb, $7, $8)`,
    [
      hashOpaqueToken(input.token),
      input.tokenType,
      input.clientId,
      input.userId,
      input.organizationId,
      JSON.stringify(input.scopes),
      input.resource,
      input.expiresAt,
    ]
  );
}

export async function findValidMcpOAuthToken(
  token: string,
  tokenType?: 'access' | 'refresh'
): Promise<McpOAuthTokenRow | null> {
  await ensureMcpOAuthTables();
  const params: (Date | boolean | number | string | null)[] = [hashOpaqueToken(token)];
  let typeClause = '';
  if (tokenType) {
    params.push(tokenType);
    typeClause = ` AND token_type = $${params.length}`;
  }
  const res = await query<{
    client_id: string;
    expires_at: Date;
    organization_id: string;
    resource: string | null;
    revoked_at: Date | null;
    scopes: unknown;
    token_type: 'access' | 'refresh';
    user_id: string;
  }>(
    `SELECT token_type, client_id, user_id, organization_id, scopes, resource, expires_at, revoked_at
     FROM mcp_oauth_tokens
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()${typeClause}`,
    params
  );
  const row = res.rows[0];
  if (!row) {
    return null;
  }
  return {
    clientId: row.client_id,
    expiresAt: row.expires_at,
    organizationId: row.organization_id,
    resource: row.resource,
    revokedAt: row.revoked_at,
    scopes: parseStringArray(row.scopes),
    tokenType: row.token_type,
    userId: row.user_id,
  };
}

export async function revokeMcpOAuthToken(token: string): Promise<void> {
  await ensureMcpOAuthTables();
  await query(
    `UPDATE mcp_oauth_tokens SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashOpaqueToken(token)]
  );
}
