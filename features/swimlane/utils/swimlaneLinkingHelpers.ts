import type { Task, TaskLink, TaskPosition } from '@/types';

import {
  isSwimlaneCommentTask,
  isSwimlaneCommentTaskId,
  isSwimlaneDiagramTask,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { positionToEndCell, positionToStartCell } from '@/features/sprint/utils/occupancyUtils';
import { getSwimlaneCardRadiusClass } from '@/features/task/components/TaskCard/taskCardLayoutHelpers';
import { isSwimlaneImageTask, isSwimlaneImageTaskId } from '@/features/task/utils/swimlaneImageTask';
import {
  plannerLinkEndpointAliases,
  rewritePlannerLinkEndpoint,
} from '@/lib/planner/plannerLinkEndpoint';

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
    (link) =>
      knownPlannerLinkEndpoint(knownTaskIds, link.fromTaskId) &&
      knownPlannerLinkEndpoint(knownTaskIds, link.toTaskId)
  );
}

function knownPlannerLinkEndpoint(
  knownTaskIds: { has: (id: string) => boolean },
  taskId: string
): boolean {
  return plannerLinkEndpointAliases(taskId).some((id) => knownTaskIds.has(id));
}

function linkTouchesPlannerTaskId(
  link: { fromTaskId: string; toTaskId: string },
  taskId: string
): boolean {
  const aliases = new Set(plannerLinkEndpointAliases(taskId));
  return aliases.has(link.fromTaskId) || aliases.has(link.toTaskId);
}

export function selectTaskLinksTouchingId<T extends { fromTaskId: string; id: string; toTaskId: string }>(
  links: readonly T[],
  taskId: string
): T[] {
  return links.filter((link) => linkTouchesPlannerTaskId(link, taskId));
}

export function excludeTaskLinksTouchingId<T extends { fromTaskId: string; toTaskId: string }>(
  links: readonly T[],
  taskId: string
): T[] {
  return links.filter((link) => !linkTouchesPlannerTaskId(link, taskId));
}

function plannerLinkPairKey(fromTaskId: string, toTaskId: string): string {
  return `${fromTaskId}\0${toTaskId}`;
}

function rewriteTaskLinkEndpoints<T extends { fromTaskId: string; toTaskId: string }>(
  link: T,
  fromTaskId: string,
  toTaskId: string
): T {
  const nextFrom = rewritePlannerLinkEndpoint(link.fromTaskId, fromTaskId, toTaskId);
  const nextTo = rewritePlannerLinkEndpoint(link.toTaskId, fromTaskId, toTaskId);
  if (nextFrom === link.fromTaskId && nextTo === link.toTaskId) {
    return link;
  }
  return { ...link, fromTaskId: nextFrom, toTaskId: nextTo };
}

function shouldDropRetargetedLink(
  fromTaskId: string,
  toTaskId: string,
  existingPairs: ReadonlySet<string>
): boolean {
  return fromTaskId === toTaskId || existingPairs.has(plannerLinkPairKey(fromTaskId, toTaskId));
}

/** Move arrows from a note/task id onto another card; new ids so the old rows can be deleted. */
export function retargetTaskLinksToEndpoint<
  T extends { fromTaskId: string; id: string; toTaskId: string },
>(
  links: readonly T[],
  fromTaskId: string,
  toTaskId: string,
  nextLinkId: (link: T) => string = () => buildSwimlaneLinkId()
): {
  dropped: T[];
  nextLinks: T[];
  replaced: Array<{ next: T; previous: T }>;
} {
  if (fromTaskId === toTaskId) {
    return { dropped: [], nextLinks: [...links], replaced: [] };
  }
  const dropped: T[] = [];
  const nextLinks: T[] = [];
  const replaced: Array<{ next: T; previous: T }> = [];
  const existingPairs = new Set(
    links.map((link) => plannerLinkPairKey(link.fromTaskId, link.toTaskId))
  );
  for (const link of links) {
    const rewritten = rewriteTaskLinkEndpoints(link, fromTaskId, toTaskId);
    if (rewritten === link) {
      nextLinks.push(link);
      continue;
    }
    if (shouldDropRetargetedLink(rewritten.fromTaskId, rewritten.toTaskId, existingPairs)) {
      dropped.push(link);
      continue;
    }
    existingPairs.add(plannerLinkPairKey(rewritten.fromTaskId, rewritten.toTaskId));
    const next = { ...rewritten, id: nextLinkId(link) };
    replaced.push({ next, previous: link });
    nextLinks.push(next);
  }
  return { dropped, nextLinks, replaced };
}

export function buildSwimlaneLinkId(): string {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface PlannerTaskLink {
  fromTaskId: string;
  id: string;
  toTaskId: string;
}

export async function persistRetargetedTaskLinks(input: {
  fromTaskId: string;
  taskLinks: PlannerTaskLink[];
  toTaskId: string;
  deleteLink: (linkId: string) => Promise<void>;
  saveLink: (link: PlannerTaskLink) => Promise<void>;
  setTaskLinks: (updater: (prev: PlannerTaskLink[]) => PlannerTaskLink[]) => void;
}): Promise<void> {
  const result = retargetTaskLinksToEndpoint(input.taskLinks, input.fromTaskId, input.toTaskId);
  if (result.dropped.length === 0 && result.replaced.length === 0) {
    return;
  }
  input.setTaskLinks(() => result.nextLinks);
  const persist = [
    ...result.dropped.map((link) => input.deleteLink(link.id)),
    ...result.replaced.flatMap(({ next, previous }) => [
      input.deleteLink(previous.id),
      input.saveLink(next),
    ]),
  ];
  await Promise.all(
    persist.map((operation) =>
      operation.catch((error: unknown) => {
        console.error('Error retargeting planner link:', error);
      })
    )
  );
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
