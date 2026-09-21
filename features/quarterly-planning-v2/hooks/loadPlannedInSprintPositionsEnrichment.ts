import type { TaskPosition } from '@/types';

import { fetchParentStatusesAndTypes } from '@/features/sprint/components/SprintPlanner/occupancy/hooks/useParentStatuses';

function collectSourceTaskIdsFromPositions(
  result: Map<string, TaskPosition[]>,
): string[] {
  const sourceTaskIds = new Set<string>();
  for (const position of [...result.values()].flat()) {
    if (position.sourceTaskId) {
      sourceTaskIds.add(position.sourceTaskId);
    }
  }
  return Array.from(sourceTaskIds);
}

function enrichPositionWithIssueMeta(
  position: TaskPosition,
  statusesMap: Map<string, string>,
  summariesMap: Map<string, string>,
): void {
  if (!position.sourceTaskId) return;
  const st = statusesMap.get(position.sourceTaskId);
  if (st) position.originalStatus = st;
  const summary = summariesMap.get(position.sourceTaskId);
  if (summary != null) position.sourceTaskSummary = summary;
}

export async function enrichPositionsWithIssueMeta(
  result: Map<string, TaskPosition[]>
): Promise<void> {
  const sourceTaskIds = collectSourceTaskIdsFromPositions(result);
  if (sourceTaskIds.length === 0) return;

  const { statuses: statusesMap, summaries: summariesMap } =
    await fetchParentStatusesAndTypes(sourceTaskIds);

  for (const list of result.values()) {
    for (const p of list) {
      enrichPositionWithIssueMeta(p, statusesMap, summariesMap);
    }
  }
}
