import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function createOrganization(name: string): Promise<{
  id: string;
  name: string;
  slug: string | null;
}> {
  const { data } = await getPlannerBeerTrackerApi().post<{
    organization?: { id: string; name: string; slug: string | null };
  }>('/organizations', { name });
  if (!data.organization) {
    throw new Error('Organization not returned');
  }
  return data.organization;
}

export async function patchOrganizationName(
  id: string,
  name: string
): Promise<{ id: string; name: string; slug: string | null }> {
  const { data } = await getPlannerBeerTrackerApi().patch<{
    organization?: { id: string; name: string; slug: string | null };
  }>(`/organizations/${id}`, { name });
  if (!data.organization) {
    throw new Error('Organization not returned');
  }
  return data.organization;
}
