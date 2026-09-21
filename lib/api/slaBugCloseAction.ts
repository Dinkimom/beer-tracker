import type { SlaBugCloseP4Action } from '@/lib/slaBugs/closeP4Actions';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

interface SlaBugCloseP4ActionResponse {
  approvalComment: string | null;
  success: boolean;
  tag: string;
}

export async function applySlaBugCloseP4Action(
  issueKey: string,
  action: SlaBugCloseP4Action
): Promise<SlaBugCloseP4ActionResponse> {
  const { data } = await getPlannerBeerTrackerApi().post<SlaBugCloseP4ActionResponse>(
    `/issues/${issueKey}/sla-bug-close-action`,
    { action }
  );
  return data;
}
