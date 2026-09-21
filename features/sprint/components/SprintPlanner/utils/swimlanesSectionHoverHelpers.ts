import type { Task, TaskPosition } from '@/types';

import { collectTimelineHoverLinkedTaskIds } from '@/features/swimlane/utils/task-arrows/collectTimelinePredecessorTaskIds';

interface TaskLinkLike {
  fromTaskId: string;
  toTaskId: string;
}

/**
 * Hover-кластер: все предшественники по таймлайну + один hop вперёд (кого блокирует; + QA).
 */
export function computeHoverConnectedTaskIds(
  hoveredTaskId: string | null,
  filteredTaskLinks: TaskLinkLike[],
  qaTasksMap: Map<string, Task> | undefined,
  taskPositions: Map<string, TaskPosition> | undefined
): Set<string> | null {
  if (!hoveredTaskId) return null;
  const links = appendSyntheticQaLinks(filteredTaskLinks, qaTasksMap, taskPositions);
  return collectTimelineHoverLinkedTaskIds(hoveredTaskId, links, taskPositions);
}

function appendSyntheticQaLinks(
  filteredTaskLinks: TaskLinkLike[],
  qaTasksMap: Map<string, Task> | undefined,
  taskPositions: Map<string, TaskPosition> | undefined
): TaskLinkLike[] {
  if (!qaTasksMap || !taskPositions) {
    return filteredTaskLinks;
  }
  const links = [...filteredTaskLinks];
  for (const [devTaskId, qaTask] of qaTasksMap) {
    if (!taskPositions.has(devTaskId) || !taskPositions.has(qaTask.id)) continue;
    links.push({ fromTaskId: devTaskId, toTaskId: qaTask.id });
  }
  return links;
}
