import { NextResponse } from 'next/server';

import { requireTenantWithPlannerProfile } from '@/lib/api-tenant';
import { fetchGitLabMergeRequestFacts } from '@/lib/gitlab/mergeRequestFact';
import { findOrganizationById } from '@/lib/organizations';

function parseLinksFromQuery(url: URL): string[] {
  const direct = url.searchParams.getAll('link').map((x) => x.trim()).filter(Boolean);
  const csv = (url.searchParams.get('links') ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return Array.from(new Set([...direct, ...csv]));
}

/**
 * GET /api/organizations/[organizationId]/gitlab/merge-requests/fact
 * Query: link=<url>&link=<url> или links=url1,url2
 * Ответ: factByLink — checks + events (merged / approvals / pipelines), кэш 10 мин на сервере.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantWithPlannerProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }

  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const links = parseLinksFromQuery(requestUrl);
  if (links.length === 0) {
    return NextResponse.json({ factByLink: {} });
  }
  if (links.length > 50) {
    return NextResponse.json({ error: 'Слишком много ссылок (максимум 50)' }, { status: 400 });
  }

  const factByLink = await fetchGitLabMergeRequestFacts(links);
  return NextResponse.json({ factByLink });
}
