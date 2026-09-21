import type { SprintInfo, SprintListItem } from '@/types/tracker';

export function sprintInfoFromListItem(item: SprintListItem): SprintInfo {
  return {
    endDate: item.endDate,
    endDateTime: item.endDateTime,
    id: item.id,
    name: item.name,
    startDate: item.startDate,
    startDateTime: item.startDateTime,
    status: item.status,
    version: item.version,
  };
}

export function resolvePlannerSprintInfo(
  fromTasks: SprintInfo | null | undefined,
  fromList: SprintListItem | undefined
): SprintInfo | null {
  if (fromTasks != null) return fromTasks;
  if (fromList) return sprintInfoFromListItem(fromList);
  return null;
}
