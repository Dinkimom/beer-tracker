import type { AccessProfile } from '@/lib/access/orgAccess';
import type { RequirePlannerTenantResult, TenantContext } from '@/lib/api-tenant';

import { NextResponse } from 'next/server';

import { verifySprintContextMcpSecret } from '@/lib/env';
import { listAllOrganizationsAdminSummaries } from '@/lib/organizations/organizationRepository';

const MCP_AGENT_USER_ID = 'mcp-agent';

/** Bearer или `X-Sprint-Context-Secret` — секрет MCP без org_id. */
export function readSprintContextMcpToken(request: Request): string {
  const headerSecret = request.headers.get('x-sprint-context-secret')?.trim() ?? '';
  if (headerSecret) {
    return headerSecret;
  }
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

/**
 * Если передан валидный MCP-секрет — tenant первой (единственной) org инстанса.
 * Org header не нужен: мультитенантность в этой сборке не используется.
 * Иначе `null` — вызывающий код идёт в обычный {@link requireTenantContext}.
 */
export async function tryRequireSprintContextMcpAuth(
  request: Request
): Promise<RequirePlannerTenantResult | null> {
  const token = readSprintContextMcpToken(request);
  if (!token || !verifySprintContextMcpSecret(token)) {
    return null;
  }

  const organizationId =
    (await listAllOrganizationsAdminSummaries())[0]?.organization_id ?? null;
  if (!organizationId) {
    return {
      response: NextResponse.json({ error: 'Организация не найдена' }, { status: 503 }),
    };
  }

  const ctx: TenantContext = {
    organizationId,
    role: 'org_admin',
    userId: MCP_AGENT_USER_ID,
  };
  const profile: AccessProfile = {
    organizationId,
    orgRole: 'org_admin',
    teamMemberships: [],
    userId: MCP_AGENT_USER_ID,
  };
  return { ctx, profile };
}
