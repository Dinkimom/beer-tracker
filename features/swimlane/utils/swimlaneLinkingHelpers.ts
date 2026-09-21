import type { Task, TaskLink, TaskPosition } from '@/types';

import {
  isSwimlaneCommentTask,
  isSwimlaneCommentTaskId,
  isSwimlaneDiagramTask,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { positionToEndCell, positionToStartCell } from '@/features/sprint/utils/occupancyUtils';
import { getSwimlaneCardRadiusClass } from '@/features/task/components/TaskCard/taskCardLayoutHelpers';
import { isSwimlaneImageTask, isSwimlaneImageTaskId } from '@/features/task/utils/swimlaneImageTask';

/** Черновики quick-add нельзя сохранять в task_links. */
function isUnsavedSwimlaneLinkEndpoint(taskId: string): boolean {
  return taskId.startsWith('local-task-') || isSwimlaneImageTaskId(taskId);
}

export function canUseSwimlaneLinkEndpoint(taskId: string): boolean {
  return !isUnsavedSwimlaneLinkEndpoint(taskId);
}

export function isSwimlaneLinkingSessionActive(
  linkingFromTaskId: string | null,
  linkToolArmed: boolean
): boolean {
  return linkingFromTaskId != null || linkToolArmed;
}

/** Крестик отмены у карточки-источника — только one-shot из меню, не из капсулы «Связь». */
export function isSwimlaneCardContextLinking(
  linkingFromTaskId: string | null,
  linkToolArmed: boolean
): boolean {
  return linkingFromTaskId != null && !linkToolArmed;
}

/** Крестики удаления связей — пока капсула «Связь» активна (все пользовательские связи). */
export function shouldShowSwimlaneLinkDeleteHandles(linkToolArmed: boolean): boolean {
  return linkToolArmed;
}

type SwimlaneLinkingCardClickAction =
  | 'cancel-source'
  | 'complete'
  | 'ignore'
  | 'open'
  | 'start-source';

export function resolveSwimlaneLinkingCardClick(input: {
  canCompleteLink: boolean;
  canUseAsSource: boolean;
  linkToolArmed: boolean;
  linkingFromTaskId: string | null;
  taskId: string;
}): SwimlaneLinkingCardClickAction {
  if (input.linkingFromTaskId != null) {
    if (input.linkingFromTaskId === input.taskId) {
      return 'cancel-source';
    }
    if (input.canCompleteLink) {
      return 'complete';
    }
    return input.canUseAsSource ? 'start-source' : 'ignore';
  }
  if (!input.linkToolArmed) {
    return 'open';
  }
  return input.canUseAsSource ? 'start-source' : 'ignore';
}

/** Конец плана задачи-источника (после последнего отрезка). */
export function computeSwimlaneLinkSourceEndCell(
  linkingFromTaskId: string | null,
  taskPositions: Map<string, TaskPosition>
): number | null {
  if (!linkingFromTaskId) return null;
  const position = taskPositions.get(linkingFromTaskId);
  if (!position) return null;
  return positionToEndCell(position);
}

export function computeSwimlaneLinkAlreadyExists(
  linkingFromTaskId: string | null,
  targetTaskId: string,
  taskLinks: Array<Pick<TaskLink, 'fromTaskId' | 'toTaskId'>>
): boolean {
  if (!linkingFromTaskId) return false;
  return taskLinks.some((l) => l.fromTaskId === linkingFromTaskId && l.toTaskId === targetTaskId);
}

export function computeSwimlaneValidLinkTargetByTime(
  targetPosition: TaskPosition | undefined,
  sourceEndCell: number | null
): boolean {
  if (sourceEndCell == null || !targetPosition) return false;
  return positionToStartCell(targetPosition) >= sourceEndCell;
}

export function resolveSwimlanePlacementLinkMode(input: {
  linkAlreadyExists: boolean;
  linkToolArmed: boolean;
  linkingFromTaskId: string | null;
  segmentEditorActive: boolean;
  taskId: string;
  validTargetByTime: boolean;
}): 'source' | 'target' | null {
  if (input.segmentEditorActive) {
    return null;
  }
  if (input.linkingFromTaskId != null) {
    return resolveSwimlaneTaskLinkMode({
      linkAlreadyExists: input.linkAlreadyExists,
      linkingFromTaskId: input.linkingFromTaskId,
      taskId: input.taskId,
      validTargetByTime: input.validTargetByTime,
    });
  }
  if (input.linkToolArmed && canUseSwimlaneLinkEndpoint(input.taskId)) {
    return 'target';
  }
  return null;
}

export function resolveSwimlaneTaskLinkMode(input: {
  linkAlreadyExists: boolean;
  linkingFromTaskId: string | null;
  taskId: string;
  validTargetByTime: boolean;
}): 'source' | 'target' | null {
  const { linkAlreadyExists, linkingFromTaskId, taskId, validTargetByTime } = input;
  if (linkingFromTaskId == null) return null;
  if (isUnsavedSwimlaneLinkEndpoint(taskId) || isUnsavedSwimlaneLinkEndpoint(linkingFromTaskId)) {
    return null;
  }
  if (linkingFromTaskId === taskId) return 'source';
  if (linkAlreadyExists) return null;
  if (validTargetByTime) return 'target';
  if (isSwimlaneCommentTaskId(taskId) || isSwimlaneCommentTaskId(linkingFromTaskId)) {
    return 'target';
  }
  return null;
}

export function filterTaskLinksByKnownTaskIds<T extends { fromTaskId: string; toTaskId: string }>(
  links: readonly T[],
  knownTaskIds: { has: (id: string) => boolean }
): T[] {
  return links.filter(
    (link) => knownTaskIds.has(link.fromTaskId) && knownTaskIds.has(link.toTaskId)
  );
}

export function selectTaskLinksTouchingId<T extends { fromTaskId: string; id: string; toTaskId: string }>(
  links: readonly T[],
  taskId: string
): T[] {
  return links.filter((link) => link.fromTaskId === taskId || link.toTaskId === taskId);
}

export function excludeTaskLinksTouchingId<T extends { fromTaskId: string; toTaskId: string }>(
  links: readonly T[],
  taskId: string
): T[] {
  return links.filter((link) => link.fromTaskId !== taskId && link.toTaskId !== taskId);
}

export function buildSwimlaneLinkId(): string {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** DOM-якорь курсора для превью рисуемой связи. */
export const SWIMLANE_LINK_PREVIEW_CURSOR_ID = 'swimlane-link-preview-cursor';

/** Скругление обводки в режиме связей: у аннотаций квадратное, у задач — как у карточки. */
export function resolveSwimlaneLinkingOutlineRadiusClass(
  task: Pick<Task, 'id' | 'localDraftKind'>
): string {
  return getSwimlaneCardRadiusClass(
    isSwimlaneImageTask(task) || isSwimlaneDiagramTask(task),
    isSwimlaneCommentTask(task)
  );
}

/** Цель превью: валидная карточка под курсором, иначе `null` (линия к курсору). */
export function resolveSwimlaneLinkPreviewTargetId(input: {
  hoveredTaskId: string | null;
  linkingFromTaskId: string | null;
  taskLinks: Array<Pick<TaskLink, 'fromTaskId' | 'toTaskId'>>;
  taskPositions: Map<string, TaskPosition>;
}): string | null {
  const { hoveredTaskId, linkingFromTaskId, taskLinks, taskPositions } = input;
  if (!linkingFromTaskId || !hoveredTaskId) return null;
  const mode = resolveSwimlaneTaskLinkMode({
    linkAlreadyExists: computeSwimlaneLinkAlreadyExists(
      linkingFromTaskId,
      hoveredTaskId,
      taskLinks
    ),
    linkingFromTaskId,
    taskId: hoveredTaskId,
    validTargetByTime: computeSwimlaneValidLinkTargetByTime(
      taskPositions.get(hoveredTaskId),
      computeSwimlaneLinkSourceEndCell(linkingFromTaskId, taskPositions)
    ),
  });
  return mode === 'target' ? hoveredTaskId : null;
}
