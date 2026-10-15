import type { Task } from '@/types';
import type { SprintInfo } from '@/types/tracker';

import { isTodaySprintFirstWeekMonday } from '@/utils/dateUtils';

/** Цели: в драфте — всем; в работе — админу организации всегда, остальным только в первый понедельник. */
export function resolveSidebarCanEdit(
  sprintInfo?: SprintInfo | null,
  isOrganizationAdmin = false,
): boolean {
  if (!sprintInfo) {
    return false;
  }
  const isDraft = sprintInfo.status === 'draft' || sprintInfo.status === 'Draft';
  if (isDraft) {
    return true;
  }
  const isInProgress = sprintInfo.status === 'in_progress' || sprintInfo.status === 'In Progress';
  if (isOrganizationAdmin && isInProgress) {
    return true;
  }
  return isTodaySprintFirstWeekMonday(sprintInfo.startDate);
}

export function resolveSidebarGoalsLoading(
  externalGoalsLoading: boolean,
  externalDeliveryGoalsLoading: boolean,
  externalDiscoveryGoalsLoading: boolean,
): boolean {
  return externalGoalsLoading || externalDeliveryGoalsLoading || externalDiscoveryGoalsLoading;
}

export function resolveSidebarGoalTaskIds(
  externalGoalTaskIds: string[] | undefined,
  allSprintTasks: Task[] | undefined,
  tasks: Task[],
): string[] {
  if (externalGoalTaskIds) {
    return externalGoalTaskIds;
  }
  return (allSprintTasks ?? tasks).filter((task) => task.type === 'goal').map((task) => task.id);
}

export function resolveSidebarSprintInfoContext(sprintInfo?: SprintInfo | null) {
  if (!sprintInfo) {
    return null;
  }
  return {
    id: sprintInfo.id,
    status: sprintInfo.status,
    version: sprintInfo.version,
    startDate: sprintInfo.startDate,
    endDate: sprintInfo.endDate,
  };
}

export function resolveSidebarHeaderSprintInfo(sprintInfo?: SprintInfo | null) {
  if (!sprintInfo) {
    return null;
  }
  return {
    id: sprintInfo.id,
    status: sprintInfo.status,
    version: sprintInfo.version,
  };
}

export function whenSidebarCanEdit<T>(canEdit: boolean, value: T | undefined): T | undefined {
  return canEdit ? value : undefined;
}
