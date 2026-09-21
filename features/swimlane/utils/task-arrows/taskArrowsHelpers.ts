import type { Task, TaskLink, TaskPosition } from '@/types';

import {
  collectTimelineHoverLinkedTaskIds,
  isLinkInHoverConnectedComponent,
} from '@/features/swimlane/utils/task-arrows/collectTimelinePredecessorTaskIds';
import { positionToEndCell, positionToStartCell } from '@/lib/planner-timeline/occupancyUtils';

/** Синтетическая связь dev → QA для стрелки между фазами (id с этим префиксом нельзя удалить). */
export const TASK_ARROWS_DEV_QA_LINK_PREFIX = 'dev-qa-';

export function buildTasksMapById(tasks: Task[]): Map<string, Task> {
  const map = new Map<string, Task>();
  for (const task of tasks) {
    map.set(task.id, task);
  }
  return map;
}

export function buildDevToQaSyntheticLinks(
  taskLinks: TaskLink[],
  qaTasksMap: Map<string, Task>,
  taskPositions: Map<string, TaskPosition>
): TaskLink[] {
  const existingPair = new Set(taskLinks.map((l) => `${l.fromTaskId}-${l.toTaskId}`));
  const out: TaskLink[] = [];
  qaTasksMap.forEach((qaTask, devTaskId) => {
    if (
      taskPositions.has(devTaskId) &&
      taskPositions.has(qaTask.id) &&
      !existingPair.has(`${devTaskId}-${qaTask.id}`)
    ) {
      out.push({
        id: `${TASK_ARROWS_DEV_QA_LINK_PREFIX}${devTaskId}`,
        fromTaskId: devTaskId,
        toTaskId: qaTask.id,
      });
    }
  });
  return out;
}

export function mergeTaskLinksWithDevQa(
  taskLinks: TaskLink[],
  qaTasksMap: Map<string, Task> | undefined,
  taskPositions: Map<string, TaskPosition> | undefined
): TaskLink[] {
  if (!qaTasksMap || !taskPositions) {
    return [...taskLinks];
  }
  return [...taskLinks, ...buildDevToQaSyntheticLinks(taskLinks, qaTasksMap, taskPositions)];
}

/**
 * Стрелка нужна только если оба конца реально стоят на доске.
 * Иначе SVG-стрелка цепляется к отсутствующему `task-{id}` и линия «ломается»
 * (типичный случай: задача тестирования на свимлейне без задачи разработки).
 */
export function filterTaskLinksByPlacedEndpoints<T extends { fromTaskId: string; toTaskId: string }>(
  links: T[],
  taskPositions: Map<string, TaskPosition> | undefined
): T[] {
  if (!taskPositions) return links;
  return links.filter(
    (link) => taskPositions.has(link.fromTaskId) && taskPositions.has(link.toTaskId)
  );
}

/**
 * Подпись позиций для перерисовки стрелок: id, строка (assignee) и ячейки.
 * Только ключи Map недостаточно — после переноса карточки в другую свимлейну
 * id те же, а DOM-якоря `task-{id}` смещаются по Y.
 */
export function getSwimlaneTaskPositionsSignature(
  taskPositions: Map<string, TaskPosition> | undefined
): string {
  if (!taskPositions || taskPositions.size === 0) {
    return '';
  }
  return Array.from(taskPositions.entries())
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([id, pos]) => `${id}:${pos.assignee}:${positionToStartCell(pos)}-${positionToEndCell(pos)}`)
    .join('|');
}

/**
 * Порядок видимых строк: появление драфта/перестановка фич сдвигает все карточки по Y
 * без смены ключей позиций.
 */
export function getSwimlaneVisibleAssigneesSignature(
  visibleDeveloperIds: Set<string> | undefined
): string {
  if (!visibleDeveloperIds || visibleDeveloperIds.size === 0) {
    return '';
  }
  return Array.from(visibleDeveloperIds).join('|');
}

export function filterTaskLinksForActiveDrag(
  allLinks: TaskLink[],
  activeTaskId: string | null
): TaskLink[] {
  if (!activeTaskId) return allLinks;
  return allLinks.filter(
    (link) => link.fromTaskId !== activeTaskId && link.toTaskId !== activeTaskId
  );
}

export function filterTaskLinksForSegmentEdit(
  links: TaskLink[],
  segmentEditTaskId: string | null
): TaskLink[] {
  if (segmentEditTaskId == null) return links;
  return links.filter(
    (link) =>
      link.fromTaskId !== segmentEditTaskId && link.toTaskId !== segmentEditTaskId
  );
}

export function filterTaskLinksByVisibleDevelopers(
  links: TaskLink[],
  tasksMap: Map<string, Task>,
  taskPositions: Map<string, TaskPosition> | undefined,
  visibleDeveloperIds: Set<string>
): TaskLink[] {
  return links.filter((link) => {
    const fromTask = tasksMap.get(link.fromTaskId);
    const toTask = tasksMap.get(link.toTaskId);

    const fromPosition = taskPositions?.get(link.fromTaskId);
    const toPosition = taskPositions?.get(link.toTaskId);
    const fromAssignee = fromPosition?.assignee || fromTask?.assignee;
    const toAssignee = toPosition?.assignee || toTask?.assignee;

    const fromTaskVisible = !fromAssignee || visibleDeveloperIds.has(fromAssignee);
    const toTaskVisible = !toAssignee || visibleDeveloperIds.has(toAssignee);

    return fromTaskVisible && toTaskVisible;
  });
}

export function partitionTaskArrowLinks(
  visibleLinks: TaskLink[],
  hoveredLinkId: string | null,
  hoveredTaskIdForArrows: string | null,
  taskPositions?: Map<string, TaskPosition>
): {
  hoverConnectedTaskIds: Set<string> | null;
  hoveredLink: TaskLink | undefined;
  hoveredTaskLinks: TaskLink[];
  regularLinks: TaskLink[];
} {
  const hoveredLink = hoveredLinkId
    ? visibleLinks.find((link) => hoveredLinkId === link.id)
    : undefined;
  const hoverConnectedTaskIds =
    hoveredTaskIdForArrows != null
      ? collectTimelineHoverLinkedTaskIds(
          hoveredTaskIdForArrows,
          visibleLinks,
          taskPositions
        )
      : null;
  const hoveredTaskLinks = visibleLinks.filter(
    (link) =>
      hoveredLinkId !== link.id &&
      isLinkInHoverConnectedComponent(hoverConnectedTaskIds, hoveredTaskIdForArrows, link)
  );
  const regularLinks = visibleLinks.filter(
    (link) =>
      hoveredLinkId !== link.id &&
      !isLinkInHoverConnectedComponent(hoverConnectedTaskIds, hoveredTaskIdForArrows, link)
  );
  return { hoverConnectedTaskIds, hoveredLink, hoveredTaskLinks, regularLinks };
}
