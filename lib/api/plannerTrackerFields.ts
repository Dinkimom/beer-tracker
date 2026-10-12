import type { PlannerTrackerField } from '@/lib/tracker/plannerTrackerFieldOptions';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function fetchPlannerTrackerFields(organizationId: string): Promise<PlannerTrackerField[]> {
  const api = getPlannerBeerTrackerApi();
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
  const path =
    base === '/api/demo'
      ? '/planner-tracker-fields'
      : `/organizations/${organizationId}/tracker-fields`;
  const { data } = await api.get<{ fields?: PlannerTrackerField[] }>(path);
  return Array.isArray(data.fields) ? data.fields : [];
}

export async function fetchPlannerTrackerFieldOptions(
  organizationId: string,
  fieldId: string
): Promise<string[]> {
  const api = getPlannerBeerTrackerApi();
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
  if (base === '/api/demo') {
    return [];
  }
  const path = `/organizations/${organizationId}/tracker-fields/${encodeURIComponent(fieldId)}/options`;
  const { data } = await api.get<{ values?: string[] }>(path);
  return Array.isArray(data.values) ? data.values : [];
}
