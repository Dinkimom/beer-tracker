import type { SprintInfo } from './occupancyTableHeaderTypes';

import { WORKING_DAYS, WORKING_DAYS_PER_WEEK } from '@/constants';
import { countWorkingDaysInclusiveCalendarRange } from '@/utils/dateUtils';

export function findCurrentSprintIndex(sprintInfos: SprintInfo[]): number {
  const now = new Date();
  return sprintInfos.findIndex((s) => isDateWithinSprintRange(now, s));
}

function isDateWithinSprintRange(date: Date, sprint: SprintInfo): boolean {
  const start = new Date(sprint.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate ?? sprint.startDate);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

export function sprintWorkingDaysForHeader(sprint: SprintInfo): number {
  if (sprint.endDate == null) {
    return WORKING_DAYS;
  }
  return Math.max(
    1,
    countWorkingDaysInclusiveCalendarRange(new Date(sprint.startDate), new Date(sprint.endDate))
  );
}

export function sprintColSpanForHeader(sprint: SprintInfo, displayAsWeeks: boolean): number {
  const workingDays = sprintWorkingDaysForHeader(sprint);
  return displayAsWeeks ? Math.ceil(workingDays / WORKING_DAYS_PER_WEEK) : workingDays;
}

export function isPastSprintIndex(currentSprintIndex: number, sprintIndex: number): boolean {
  return currentSprintIndex >= 0 && sprintIndex < currentSprintIndex;
}
