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

export async function fetchOnPremDefaultOrganizationId(): Promise<string | null> {
  const { data } = await getPlannerBeerTrackerApi().get<{ organizationId?: string }>(
    '/onprem/default-organization'
  );
  const id = data.organizationId?.trim();
  return id || null;
}

export async function postOnPremTrackerSession(body: Record<string, unknown>): Promise<void> {
  await getPlannerBeerTrackerApi().post('/auth/onprem/tracker-session', body);
}
