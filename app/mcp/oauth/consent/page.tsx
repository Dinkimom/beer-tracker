import { redirect } from 'next/navigation';

import { getVerifiedProductUserIdFromServerCookies } from '@/lib/auth/serverCookies';
import { MCP_OAUTH_SCOPE } from '@/lib/mcp/oauth/constants';
import { getRegisteredClient } from '@/lib/mcp/oauth/mcpOAuthService';
import { resolveMcpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { McpOAuthConsentInvalidView } from './McpOAuthConsentInvalidView';
import { McpOAuthConsentView } from './McpOAuthConsentView';

interface ConsentPageProps {
  searchParams: Promise<Record<string, string[] | string | undefined>>;
}

function firstParam(value: string[] | string | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/**
 * MCP OAuth consent: approve/deny connecting an agent client to Beer Tracker planning tools.
 */
export default async function McpOAuthConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const clientId = firstParam(params.client_id);
  const redirectUri = firstParam(params.redirect_uri);
  const codeChallenge = firstParam(params.code_challenge);
  const codeChallengeMethod = firstParam(params.code_challenge_method) || 'S256';
  const scope = firstParam(params.scope) || MCP_OAUTH_SCOPE;
  const state = firstParam(params.state);
  const resource = firstParam(params.resource);

  const userId = await getVerifiedProductUserIdFromServerCookies();
  if (!userId) {
    const qs = new URLSearchParams();
    for (const [key, raw] of Object.entries(params)) {
      const v = firstParam(raw);
      if (v) {
        qs.set(key, v);
      }
    }
    redirect(`/auth-setup?next=${encodeURIComponent(`/mcp/oauth/consent?${qs.toString()}`)}`);
  }

  if (!clientId || !redirectUri || !codeChallenge) {
    return <McpOAuthConsentInvalidView />;
  }

  const client = await getRegisteredClient(clientId);
  const clientLabel = client?.client_name?.trim() || clientId;
  const brand = resolveMcpOAuthClientBrand({
    clientName: client?.client_name,
    clientUri: client?.client_uri,
  });

  return (
    <McpOAuthConsentView
      brand={brand}
      clientId={clientId}
      clientLabel={clientLabel}
      codeChallenge={codeChallenge}
      codeChallengeMethod={codeChallengeMethod}
      redirectUri={redirectUri}
      resource={resource}
      scope={scope}
      state={state}
    />
  );
}
