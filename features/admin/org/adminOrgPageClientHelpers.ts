import type { UserOrganizationSummary } from '@/lib/organizations';

import { patchOrganizationName as patchOrganizationNameRequest } from '@/lib/api/organizations';
import { readApiErrorMessage } from '@/lib/api/readApiError';

export async function patchOrganizationName(
  id: string,
  trimmed: string
): Promise<
  { ok: false; error?: string } | { ok: true; organization: { id: string; name: string; slug: string | null } }
> {
  try {
    const organization = await patchOrganizationNameRequest(id, trimmed);
    return { ok: true, organization };
  } catch (error) {
    return { ok: false, error: readApiErrorMessage(error, '') || undefined };
  }
}

export function applyRenamedOrganization(
  orgs: UserOrganizationSummary[],
  id: string,
  organization: { name: string; slug: string | null }
): UserOrganizationSummary[] {
  return orgs.map((o) =>
    o.organization_id === id
      ? {
          ...o,
          name: organization.name,
          slug: organization.slug ?? o.slug,
        }
      : o
  );
}
