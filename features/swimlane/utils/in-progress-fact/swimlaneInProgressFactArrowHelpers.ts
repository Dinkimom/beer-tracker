import type { SegmentWithPhase } from './swimlaneInProgressFactLayerHelpers';

import { swimlaneFactBarElementId } from './swimlaneInProgressFactLayerHelpers';

function groupSegmentsWithPhaseByTask(items: SegmentWithPhase[]): Map<string, SegmentWithPhase[]> {
  const byTask = new Map<string, SegmentWithPhase[]>();
  for (const item of items) {
    const taskId = item.seg.taskId;
    const list = byTask.get(taskId) ?? [];
    list.push(item);
    byTask.set(taskId, list);
  }
  return byTask;
}

function buildArrowPairsForTaskList(
  list: SegmentWithPhase[],
  layerId: string
): Array<{ from: string; to: string; taskId: string }> {
  if (list.length < 2) return [];
  const sorted = [...list].sort((a, b) => a.seg.startTimeMs - b.seg.startTimeMs);
  const pairs: Array<{ from: string; to: string; taskId: string }> = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    pairs.push({
      from: swimlaneFactBarElementId(layerId, sorted[i]!.seg),
      to: swimlaneFactBarElementId(layerId, sorted[i + 1]!.seg),
      taskId: sorted[i]!.seg.taskId,
    });
  }
  return pairs;
}

export function buildArrowPairsForSameTask(
  items: SegmentWithPhase[],
  layerId: string
): Array<{ from: string; to: string; taskId: string }> {
  const byTask = groupSegmentsWithPhaseByTask(items);
  return [...byTask.values()].flatMap((list) => buildArrowPairsForTaskList(list, layerId));
}
