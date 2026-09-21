import type { QuarterlySprintInfo } from '@/features/quarterly-planning-v2/types';

import { WORKING_DAYS_PER_WEEK } from '@/constants';

export function occupancyDisplayColumnCount(params: {
  displayAsWeeks: boolean;
  sprintInfos?: QuarterlySprintInfo[];
  totalWeekColumnsForSprints: (sprintInfos: QuarterlySprintInfo[]) => number;
  workingDays: number;
}): number {
  const { displayAsWeeks, sprintInfos, totalWeekColumnsForSprints, workingDays } = params;
  if (!displayAsWeeks) {
    return workingDays;
  }
  if (sprintInfos && sprintInfos.length > 0) {
    return totalWeekColumnsForSprints(sprintInfos);
  }
  return Math.ceil(workingDays / WORKING_DAYS_PER_WEEK);
}
