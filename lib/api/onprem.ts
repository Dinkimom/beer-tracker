import type { OrganizationIssueTrackerPublicDto } from '@/lib/issueTrackerProvider/settings';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

interface OnPremSetupState {
  hasUsers?: boolean;
  initialized?: boolean;
  onPremMode?: boolean;
}

export async function fetchOnPremSetupState(): Promise<OnPremSetupState> {
  const { data } = await getPlannerBeerTrackerApi().get<OnPremSetupState>('/onprem/setup-state');
  return data;
}

interface OnPremDefaultOrganization {
  issueTracker: OrganizationIssueTrackerPublicDto | null;
  organizationId: string;
}

export async function fetchOnPremDefaultOrganization(): Promise<OnPremDefaultOrganization | null> {
  const { data } = await getPlannerBeerTrackerApi().get<{
    issueTracker?: OrganizationIssueTrackerPublicDto | null;
    organizationId?: string;
  }>('/onprem/default-organization');
  const organizationId = data.organizationId?.trim();
  if (!organizationId) {
    return null;
  }
  return { issueTracker: data.issueTracker ?? null, organizationId };
}

export async function fetchOnPremDefaultOrganizationId(): Promise<string | null> {
  return (await fetchOnPremDefaultOrganization())?.organizationId ?? null;
}

export async function postOnPremTrackerSession(body: Record<string, unknown>): Promise<void> {
  await getPlannerBeerTrackerApi().post('/auth/onprem/tracker-session', body);
}
