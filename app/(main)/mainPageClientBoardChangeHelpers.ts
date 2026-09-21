import type { SprintListItem } from '@/types/tracker';

import { buildPlannerPath } from '@/lib/planner/plannerUrl';

import { appendQuery } from './mainPageClientHelpers';

export function pickSprintForBoardChange(sprintsData: SprintListItem[]): SprintListItem | null {
  const activeSprint = sprintsData.find((s) => s.status === 'in_progress' && !s.archived);
  if (activeSprint) {
    return activeSprint;
  }
  return sprintsData.length > 0 ? sprintsData[0]! : null;
}

export function buildBoardChangeReplacePath(params: {
  boardId: number;
  searchParamsKey: string;
  sprintToSelect: SprintListItem | null;
}): string {
  const pathBase =
    params.sprintToSelect != null
      ? buildPlannerPath(params.boardId, params.sprintToSelect.id)
      : '/';
  return appendQuery(pathBase, params.searchParamsKey);
}
