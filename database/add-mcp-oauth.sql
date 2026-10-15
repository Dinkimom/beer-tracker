-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/add-mcp-oauth.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- OAuth 2.1 AS storage for remote MCP (/api/mcp): DCR clients, auth codes, tokens.

CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_id_issued_at BIGINT NOT NULL,
    client_secret TEXT,
    client_secret_expires_at BIGINT,
    redirect_uris JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
    code_hash TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES mcp_oauth_clients (client_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    code_challenge TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    resource TEXT,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS mcp_oauth_codes_expires_at_idx ON mcp_oauth_codes (expires_at);

CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
    token_hash TEXT PRIMARY KEY,
    token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh')),
    client_id TEXT NOT NULL REFERENCES mcp_oauth_clients (client_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    resource TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS mcp_oauth_tokens_expires_at_idx ON mcp_oauth_tokens (expires_at);
CREATE INDEX IF NOT EXISTS mcp_oauth_tokens_client_id_idx ON mcp_oauth_tokens (client_id);

COMMENT ON TABLE mcp_oauth_clients IS 'MCP OAuth dynamic clients (RFC 7591)';
COMMENT ON TABLE mcp_oauth_codes IS 'MCP OAuth authorization codes (hashed)';
COMMENT ON TABLE mcp_oauth_tokens IS 'MCP OAuth access/refresh tokens (hashed)';
