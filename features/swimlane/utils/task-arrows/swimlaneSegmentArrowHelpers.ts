import type { Task, TaskPosition } from '@/types';

import { getOrderedPlanSegments } from '@/lib/swimlane/swimlanePlanSegments';

export interface SwimlaneSegmentArrowLink {
  endElement: string;
  id: string;
  startElement: string;
  taskId: string;
}

/**
 * DOM id карточки отрезка плана на свимлейне (совпадает с `htmlAnchorId` у TaskBar).
 * Первый отрезок и одиночная полоса — `task-${taskId}`; остальные — `task-${taskId}-seg-${segIdx}`.
 */
export function getSwimlanePlanSegmentHtmlAnchorId(taskId: string, segIdx: number): string {
  return segIdx > 0 ? `task-${taskId}-seg-${segIdx}` : `task-${taskId}`;
}

function isTaskVisibleOnSwimlane(
  taskId: string,
  position: TaskPosition,
  tasksMap: Map<string, Task> | undefined,
  visibleDeveloperIds: Set<string> | undefined
): boolean {
  if (!visibleDeveloperIds) return true;
  const task = tasksMap?.get(taskId);
  const assignee = position.assignee || task?.assignee;
  return !assignee || visibleDeveloperIds.has(assignee);
}

/**
 * Пунктирные стрелки между соседними отрезками плана одной задачи (1→2, 2→3, …).
 */
export function buildSwimlaneSegmentArrowLinks(
  taskPositions: Map<string, TaskPosition> | undefined,
  options?: {
    excludeTaskIds?: ReadonlySet<string> | null;
    tasksMap?: Map<string, Task>;
    visibleDeveloperIds?: Set<string>;
  }
): SwimlaneSegmentArrowLink[] {
  if (!taskPositions) return [];

  const links: SwimlaneSegmentArrowLink[] = [];
  const excludeTaskIds = options?.excludeTaskIds ?? null;

  for (const [taskId, position] of taskPositions) {
    if (excludeTaskIds?.has(taskId)) continue;
    if (
      !isTaskVisibleOnSwimlane(
        taskId,
        position,
        options?.tasksMap,
        options?.visibleDeveloperIds
      )
    ) {
      continue;
    }

    const segments = getOrderedPlanSegments(position);
    if (segments.length < 2) continue;

    for (let i = 0; i < segments.length - 1; i += 1) {
      const fromIndex = i;
      const toIndex = i + 1;
      links.push({
        endElement: getSwimlanePlanSegmentHtmlAnchorId(taskId, toIndex),
        id: `swimlane-segment-${taskId}-${fromIndex}-${toIndex}`,
        startElement: getSwimlanePlanSegmentHtmlAnchorId(taskId, fromIndex),
        taskId,
      });
    }
  }

  return links;
}
