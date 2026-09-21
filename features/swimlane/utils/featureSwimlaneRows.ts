import type { Comment, Developer, Task, TaskParent, TaskPosition } from '@/types';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';
import { isPlannerAnnotationTask } from '@/features/task/utils/swimlaneImageTask';
import {
  FEATURE_LANE_DRAFT_ROW_PREFIX,
  isFeatureLaneDraftRowId,
  type FeatureLanesDocument,
} from '@/lib/sprints/featureLanesDocument';
import {
  createTeamSwimlaneDeveloper,
  isTeamSwimlaneAssigneeId,
  TEAM_SWIMLANE_ASSIGNEE_ID,
} from '@/lib/swimlane/teamSwimlaneAssignee';

import { humanFeatureDraftParentDisplay } from './featureDraftParentLabel';
import {
  formatFeatureSwimlaneRowName,
  type FeatureLaneBoardLabels,
} from './featureSwimlaneRowTitles';

export { FEATURE_LANE_DRAFT_ROW_PREFIX, isFeatureLaneDraftRowId };
export {
  isFeatureLaneDraftParent,
  mergeFeatureLaneTrackerTypes,
  resolveFeatureLaneRowIssueType,
} from './featureSwimlaneRowIssueType';
export {
  buildFeatureLaneRowTitleById,
  formatFeatureSwimlaneRowName,
  resolveFeatureSwimlaneRowTitleParts,
  type FeatureLaneBoardLabels,
  type FeatureLaneRowTitleParts,
} from './featureSwimlaneRowTitles';

type FeatureLaneParentSource = 'epic' | 'parent';

export interface FeatureSwimlaneRowMeta {
  isDraft?: boolean;
  parent: TaskParent | null;
  parentSource?: FeatureLaneParentSource;
  rowId: string;
}

interface FeatureSwimlaneProjection {
  rowMetaById: Map<string, FeatureSwimlaneRowMeta>;
  rows: Developer[];
  tasksByRowId: Map<string, Task[]>;
}

function resolveTaskFeatureParent(task: Pick<Task, 'epic' | 'parent'>): TaskParent | null {
  return task.parent ?? task.epic ?? null;
}

function resolveTaskFeatureParentSource(
  task: Pick<Task, 'epic' | 'parent'>
): FeatureLaneParentSource | undefined {
  if (task.parent) return 'parent';
  if (task.epic) return 'epic';
  return undefined;
}

function isFeatureLaneSharedRowId(rowId: string): boolean {
  return isTeamSwimlaneAssigneeId(rowId) || rowId === TASK_GROUP_KEY_NO_PARENT;
}

/** Строка фичи, у которой есть меню действий: не «Общее» и не «Без родителя». */
export function isFeatureLaneActionableRowId(rowId: string): boolean {
  return !isFeatureLaneSharedRowId(rowId);
}

function trimmedFeatureLaneParentToken(value: string | undefined): string {
  return value?.trim() ?? '';
}

/**
 * Id строки фичи: ключ задачи в Трекере, иначе внутренний id.
 * Иначе после конвертации драфта заметки остаются на `ST-9`, а карточки
 * после рефетча — на `parent.id` из Трекера, и появляются две одинаковые строки.
 */
function resolveFeatureLaneParentRowId(
  parent: Pick<TaskParent, 'id' | 'key'> | null | undefined
): string | null {
  const key = trimmedFeatureLaneParentToken(parent?.key);
  if (key) {
    return key;
  }
  const id = trimmedFeatureLaneParentToken(parent?.id);
  return id || null;
}

function resolveFeatureLaneBoardRowId(input: {
  assigneeId?: string | null;
  epic?: TaskParent | null;
  parent?: TaskParent | null;
}): string {
  const fromParent = resolveFeatureLaneParentRowId(input.parent ?? input.epic ?? null);
  if (fromParent) {
    return fromParent;
  }
  if (isTeamSwimlaneAssigneeId(input.assigneeId)) {
    return TEAM_SWIMLANE_ASSIGNEE_ID;
  }
  return TASK_GROUP_KEY_NO_PARENT;
}

export function resolveTaskFeatureRowId(
  task: Pick<Task, 'assignee' | 'epic' | 'parent'>
): string {
  return resolveFeatureLaneBoardRowId({
    assigneeId: task.assignee,
    epic: task.epic,
    parent: task.parent,
  });
}

function resolveCommentFeatureRowId(
  comment: Pick<Comment, 'assigneeId' | 'parent'>
): string {
  return resolveFeatureLaneBoardRowId({
    assigneeId: comment.assigneeId,
    parent: comment.parent,
  });
}

export function projectCommentsOntoFeatureRows(comments: readonly Comment[]): Comment[] {
  return comments.map((comment) => ({
    ...comment,
    rowAssigneeId: resolveCommentFeatureRowId(comment),
  }));
}

/** Строка фичи / «Общее» — не человек. Для создания карточки нужен исполнитель. */
export function isSyntheticFeatureLaneAssignee(
  assigneeId: string | undefined,
  people: readonly Pick<Developer, 'id'>[] | undefined
): boolean {
  if (!assigneeId) {
    return false;
  }
  if (
    isTeamSwimlaneAssigneeId(assigneeId) ||
    isFeatureLaneDraftRowId(assigneeId) ||
    assigneeId === TASK_GROUP_KEY_NO_PARENT
  ) {
    return true;
  }
  if (!people?.length) {
    return false;
  }
  return !people.some((person) => person.id === assigneeId);
}

function createFeatureLaneDraftParent(row: Pick<Developer, 'id' | 'name'>): TaskParent {
  return { display: row.name, id: row.id, key: row.id };
}

/** Навешивает локального родителя-черновик на задачи, у которых его нет в Трекере. */
export function overlayFeatureLaneDraftParents(
  tasks: readonly Task[],
  document: FeatureLanesDocument | undefined
): Task[] {
  if (!document?.draftRows.length) {
    return [...tasks];
  }
  const parentByIssue = new Map<string, TaskParent>();
  for (const row of document.draftRows) {
    if (!isFeatureLaneDraftRowId(row.id) || !row.issueKeys?.length) {
      continue;
    }
    const parent = createFeatureLaneDraftParent(row);
    for (const issueKey of row.issueKeys) {
      parentByIssue.set(issueKey, parent);
    }
  }
  if (parentByIssue.size === 0) {
    return [...tasks];
  }
  return tasks.map((task) => {
    const draftParent = parentByIssue.get(task.id);
    if (!draftParent) {
      return task;
    }
    const currentKey = task.parent?.id ?? task.parent?.key ?? '';
    if (currentKey && !isFeatureLaneDraftRowId(currentKey)) {
      return task;
    }
    return { ...task, parent: draftParent };
  });
}

/**
 * Пока документ черновиков не загружен, задачи без родителя в Трекере нельзя
 * класть в «Без родителя»: после overlay они прыгнут на драфт и порвут стрелки.
 */
export function collectFeatureLaneTaskIdsWaitingForDrafts(
  tasks: readonly Pick<Task, 'assignee' | 'epic' | 'id' | 'parent'>[],
  lanesLoaded: boolean
): Set<string> {
  const ids = new Set<string>();
  if (lanesLoaded) {
    return ids;
  }
  for (const task of tasks) {
    if (resolveTaskFeatureRowId(task) === TASK_GROUP_KEY_NO_PARENT) {
      ids.add(task.id);
    }
  }
  return ids;
}

export function omitTaskPositionsByIds(
  positions: Map<string, TaskPosition>,
  taskIds: ReadonlySet<string>
): Map<string, TaskPosition> {
  if (taskIds.size === 0) {
    return positions;
  }
  const next = new Map<string, TaskPosition>();
  positions.forEach((position, taskId) => {
    if (!taskIds.has(taskId)) {
      next.set(taskId, position);
    }
  });
  return next;
}

export function createFeatureLaneDraftRow(name: string): Developer {
  return { id: `${FEATURE_LANE_DRAFT_ROW_PREFIX}${crypto.randomUUID()}`, name, role: 'other' };
}

/** Исполнитель и родитель карточки: человек, если выбран; строка драфта — только как parent. */
export function resolveAnnotationPersistFromLaneDraft(
  draftTask: Pick<Task, 'assignee' | 'parent'>,
  positionAssignee: string
): { assigneeId: string; parent?: TaskParent } {
  const selected = draftTask.assignee?.trim();
  const useSelected =
    Boolean(selected) &&
    !isTeamSwimlaneAssigneeId(selected) &&
    !isFeatureLaneDraftRowId(selected ?? '');
  const assigneeId = useSelected && selected ? selected : positionAssignee;
  return draftTask.parent ? { assigneeId, parent: draftTask.parent } : { assigneeId };
}

function compareFeatureRowIds(
  a: string,
  b: string,
  parentByRow: Map<string, TaskParent | null>
): number {
  if (isTeamSwimlaneAssigneeId(a)) return -1;
  if (isTeamSwimlaneAssigneeId(b)) return 1;
  if (a === TASK_GROUP_KEY_NO_PARENT) return 1;
  if (b === TASK_GROUP_KEY_NO_PARENT) return -1;
  const nameA = parentByRow.get(a)?.display ?? a;
  const nameB = parentByRow.get(b)?.display ?? b;
  return nameA.localeCompare(nameB, undefined, { numeric: true });
}

function createFeatureLaneBoardRow(
  rowId: string,
  parent: TaskParent | null,
  labels: FeatureLaneBoardLabels
): Developer {
  if (isTeamSwimlaneAssigneeId(rowId)) {
    return createTeamSwimlaneDeveloper(labels.teamLaneLabel);
  }
  if (rowId === TASK_GROUP_KEY_NO_PARENT) {
    return { id: TASK_GROUP_KEY_NO_PARENT, name: labels.noParentLabel, role: 'other' };
  }
  return { id: rowId, name: formatFeatureSwimlaneRowName(parent, rowId), role: 'other' };
}

export function buildFeatureSwimlaneProjection(
  tasks: Task[],
  labels: FeatureLaneBoardLabels,
  taskPositions?: ReadonlyMap<string, TaskPosition>
): FeatureSwimlaneProjection {
  const workTasks = tasks.filter((task) => !isPlannerAnnotationTask(task));
  const tasksByRowId = new Map<string, Task[]>();
  const parentByRow = new Map<string, TaskParent | null>();
  const parentSourceByRow = new Map<string, FeatureLaneParentSource>();

  workTasks.forEach((task) => {
    const rowId = resolveFeatureLaneBoardRowId({
      assigneeId: taskPositions?.get(task.id)?.assignee ?? task.assignee,
      epic: task.epic,
      parent: task.parent,
    });
    const list = tasksByRowId.get(rowId) ?? [];
    list.push(task);
    tasksByRowId.set(rowId, list);
    if (!parentByRow.has(rowId)) {
      parentByRow.set(rowId, resolveTaskFeatureParent(task));
      const source = resolveTaskFeatureParentSource(task);
      if (source) {
        parentSourceByRow.set(rowId, source);
      }
    }
  });

  if (!tasksByRowId.has(TEAM_SWIMLANE_ASSIGNEE_ID)) {
    tasksByRowId.set(TEAM_SWIMLANE_ASSIGNEE_ID, []);
  }
  if (!tasksByRowId.has(TASK_GROUP_KEY_NO_PARENT)) {
    tasksByRowId.set(TASK_GROUP_KEY_NO_PARENT, []);
  }
  parentByRow.set(TEAM_SWIMLANE_ASSIGNEE_ID, null);
  parentByRow.set(TASK_GROUP_KEY_NO_PARENT, null);

  const rowIds = [...tasksByRowId.keys()].sort((a, b) => compareFeatureRowIds(a, b, parentByRow));
  const rowMetaById = new Map<string, FeatureSwimlaneRowMeta>();
  const rows: Developer[] = rowIds.map((rowId) => {
    const parent = parentByRow.get(rowId) ?? null;
    rowMetaById.set(rowId, {
      parent,
      parentSource: parentSourceByRow.get(rowId),
      rowId,
    });
    return createFeatureLaneBoardRow(rowId, parent, labels);
  });

  return { rowMetaById, rows, tasksByRowId };
}

export function projectTaskPositionsToFeatureRows(
  taskPositions: Map<string, TaskPosition>,
  tasksMap: Map<string, Task>
): Map<string, TaskPosition> {
  const next = new Map<string, TaskPosition>();
  taskPositions.forEach((position, taskId) => {
    const task = tasksMap.get(taskId);
    if (!task || isPlannerAnnotationTask(task)) {
      next.set(taskId, position);
      return;
    }
    next.set(taskId, {
      ...position,
      assignee: resolveFeatureLaneBoardRowId({
        assigneeId: position.assignee,
        epic: task.epic,
        parent: task.parent,
      }),
    });
  });
  return next;
}

export function restoreFeatureLanePositionAssignee(
  incoming: TaskPosition,
  existing: TaskPosition | undefined,
  task: Task | undefined
): TaskPosition {
  const assignee = existing?.assignee || task?.assignee || incoming.assignee;
  return { ...incoming, assignee };
}

export function mergeFeatureLaneDraftRowMeta(
  rowMetaById: ReadonlyMap<string, FeatureSwimlaneRowMeta>,
  draftRows: readonly Pick<Developer, 'id' | 'name'>[]
): Map<string, FeatureSwimlaneRowMeta> {
  const next = new Map(rowMetaById);
  for (const row of draftRows) {
    const id = row.id.trim();
    if (!id) {
      continue;
    }
    const namedParent = createFeatureLaneDraftParent({ id, name: row.name });
    const existing = next.get(id);
    if (!existing) {
      next.set(id, {
        isDraft: isFeatureLaneDraftRowId(id),
        parent: namedParent,
        rowId: id,
      });
      continue;
    }
    const existingDisplay = existing.parent?.display?.trim() ?? '';
    if (!existingDisplay || isFeatureLaneDraftRowId(existingDisplay)) {
      next.set(id, { ...existing, isDraft: true, parent: namedParent });
    }
  }
  return next;
}

function resolveDroppedDraftParent(
  droppedRowId: string,
  rowMetaById: ReadonlyMap<string, FeatureSwimlaneRowMeta>
): TaskParent {
  const fromMeta = rowMetaById.get(droppedRowId)?.parent;
  const display = humanFeatureDraftParentDisplay(fromMeta?.display ?? '', droppedRowId);
  if (fromMeta) {
    return display ? { ...fromMeta, display } : fromMeta;
  }
  return createFeatureLaneDraftParent({ id: droppedRowId, name: droppedRowId });
}

/**
 * `undefined` — строка не менялась; `null` — снять родителя; иначе новый parent.
 */
export function resolveFeatureRowParentChange(
  droppedRowId: string,
  task: Pick<Task, 'assignee' | 'epic' | 'parent'> | undefined,
  rowMetaById: Map<string, FeatureSwimlaneRowMeta>
): TaskParent | null | undefined {
  const currentRowId = resolveFeatureLaneBoardRowId({
    assigneeId: task?.assignee,
    epic: task?.epic,
    parent: task?.parent,
  });
  if (droppedRowId === currentRowId) return undefined;
  if (isFeatureLaneSharedRowId(droppedRowId)) return null;
  if (isFeatureLaneDraftRowId(droppedRowId)) {
    return resolveDroppedDraftParent(droppedRowId, rowMetaById);
  }
  return rowMetaById.get(droppedRowId)?.parent;
}

export function resolveFeatureLaneDropAssignee(task: Task | undefined): string | null {
  return task?.assignee?.trim() || null;
}

export function applyFeatureLanePositionDrop(input: {
  droppedRowId: string;
  existing: TaskPosition | undefined;
  incoming: TaskPosition;
  rowMetaById: Map<string, FeatureSwimlaneRowMeta>;
  task: Task | undefined;
  taskId: string;
  onParentChange: (taskId: string, parent: TaskParent | null) => void;
  onPositionUpdate: (
    taskId: string,
    position: TaskPosition,
    historyOptions?: {
      sideEffects?: {
        taskParents?: Map<string, { after: TaskParent | null; before: TaskParent | null }>;
      };
    }
  ) => void;
}): void {
  const nextPosition = isTeamSwimlaneAssigneeId(input.droppedRowId)
    ? { ...input.incoming, assignee: TEAM_SWIMLANE_ASSIGNEE_ID }
    : restoreFeatureLanePositionAssignee(input.incoming, input.existing, input.task);
  const parentChange = resolveFeatureRowParentChange(
    input.droppedRowId,
    input.task,
    input.rowMetaById
  );
  const beforeParent = input.task?.parent ?? null;
  const historyOptions =
    parentChange === undefined
      ? undefined
      : {
          sideEffects: {
            taskParents: new Map([
              [input.taskId, { after: parentChange, before: beforeParent }],
            ]),
          },
        };
  input.onPositionUpdate(input.taskId, nextPosition, historyOptions);
  if (parentChange !== undefined) {
    input.onParentChange(input.taskId, parentChange);
  }
}

export function applyFeatureLaneCommentDrop(input: {
  comment: Comment | undefined;
  droppedRowId: string;
  incoming: TaskPosition;
  rowMetaById: Map<string, FeatureSwimlaneRowMeta>;
  onCommentPlanChange: (
    commentId: string,
    patch: {
      assigneeId: string;
      day: number;
      part: number;
      width: number;
    },
    parentChange: TaskParent | null | undefined
  ) => void;
}): void {
  if (!input.comment) {
    return;
  }
  const patch = {
    assigneeId: isTeamSwimlaneAssigneeId(input.droppedRowId)
      ? TEAM_SWIMLANE_ASSIGNEE_ID
      : input.comment.assigneeId,
    day: input.incoming.startDay,
    part: input.incoming.startPart,
    width: Math.max(1, input.incoming.duration),
  };
  const parentChange = resolveFeatureRowParentChange(
    input.droppedRowId,
    { assignee: input.comment.assigneeId, parent: input.comment.parent },
    input.rowMetaById
  );
  input.onCommentPlanChange(input.comment.id, patch, parentChange);
}

export function applyFeatureLaneBacklogDrop(input: {
  day: number;
  droppedRowId: string;
  part: number;
  rowMetaById: Map<string, FeatureSwimlaneRowMeta>;
  task: Task | undefined;
  taskId: string;
  onAssigneeRequired: () => void;
  onBacklogTaskDrop: (
    taskId: string,
    assigneeId: string,
    day: number,
    part: number,
    historyOptions?: {
      sideEffects?: {
        taskParents?: Map<string, { after: TaskParent | null; before: TaskParent | null }>;
      };
    }
  ) => void;
  onParentChange: (taskId: string, parent: TaskParent | null) => void;
}): void {
  const realAssignee = isTeamSwimlaneAssigneeId(input.droppedRowId)
    ? TEAM_SWIMLANE_ASSIGNEE_ID
    : resolveFeatureLaneDropAssignee(input.task);
  if (!realAssignee) {
    input.onAssigneeRequired();
    return;
  }
  const parentChange = resolveFeatureRowParentChange(
    input.droppedRowId,
    input.task,
    input.rowMetaById
  );
  const beforeParent = input.task?.parent ?? null;
  const historyOptions =
    parentChange === undefined
      ? undefined
      : {
          sideEffects: {
            taskParents: new Map([
              [input.taskId, { after: parentChange, before: beforeParent }],
            ]),
          },
        };
  input.onBacklogTaskDrop(input.taskId, realAssignee, input.day, input.part, historyOptions);
  if (parentChange !== undefined) {
    input.onParentChange(input.taskId, parentChange);
  }
}
