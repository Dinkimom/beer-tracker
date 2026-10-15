import { NextRequest } from 'next/server';

import { requestOriginFromRequest } from '@/lib/atlassianOAuth/requestOrigin';
import { buildProtectedResourceMetadata } from '@/lib/mcp/oauth/metadata';
import { oauthJson, oauthOptions } from '@/lib/mcp/oauth/oauthHttp';

export const dynamic = 'force-dynamic';

/** Path-aware RFC 9728 metadata for resource `/api/mcp`. */
export function GET(request: NextRequest) {
  const origin = requestOriginFromRequest(request);
  return oauthJson(buildProtectedResourceMetadata(origin));
}

export function OPTIONS() {
  return oauthOptions();
}
