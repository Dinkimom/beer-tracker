import type { FeatureSwimlaneRowMeta } from '@/features/swimlane/utils/featureSwimlaneRows';
import type { Comment, Task } from '@/types';

import {
  isFeatureLaneActionableRowId,
  isFeatureLaneDraftRowId,
} from '@/features/swimlane/utils/featureSwimlaneRows';
import {
  emptyFeatureLanesDocument,
  transferFeatureLaneRowToDocument,
  type FeatureLaneTransferRow,
  type FeatureLanesDocument,
} from '@/lib/sprints/featureLanesDocument';

import {
  collectFeatureLaneRowComments,
  collectFeatureLaneRowWorkTasks,
  deleteFeatureLaneRowAnnotations,
} from './featureLaneRowItems';

interface FeatureLaneRowSprintChangeInput {
  comments: Comment[];
  failedMessage: string;
  rowId: string;
  sprintId: number | null;
  tasks: Task[];
  onRemoveBoardRow: (rowId: string) => void;
}

type FeatureLaneRowSprintChangeResult = { error: string; ok: false } | { ok: true };

function canMoveFeatureLane(rowId: string, sprintId: number | null): sprintId is number {
  return sprintId != null && isFeatureLaneActionableRowId(rowId);
}

function canChangeTrackerFeatureLane(rowId: string, sprintId: number | null): sprintId is number {
  return canMoveFeatureLane(rowId, sprintId) && !isFeatureLaneDraftRowId(rowId);
}

async function changeTrackerWorkTasks(
  input: Pick<FeatureLaneRowSprintChangeInput, 'failedMessage' | 'rowId' | 'tasks'> & {
    onDeleteLocalWorkTask?: (taskId: string) => void;
  },
  changeWorkTask: (taskId: string) => Promise<void>
): Promise<string | null> {
  try {
    for (const task of collectFeatureLaneRowWorkTasks(input.rowId, input.tasks)) {
      if (task.isLocalTask === true) {
        input.onDeleteLocalWorkTask?.(task.id);
        continue;
      }
      await changeWorkTask(task.id);
    }
  } catch {
    return input.failedMessage;
  }
  return null;
}

/** Убирает фичу из спринта: заметки/фото/схемы удаляет, задачи Трекера отправляет в бэклог. */
export async function submitRemovedFeatureLane(
  input: FeatureLaneRowSprintChangeInput & {
    onCommentDelete: (commentId: string) => void;
    onDeleteAnnotationTask: (taskId: string) => void;
    onRemoveFromSprint: (taskId: string) => Promise<void>;
  }
): Promise<FeatureLaneRowSprintChangeResult> {
  if (!canChangeTrackerFeatureLane(input.rowId, input.sprintId)) {
    return { ok: true };
  }
  const workError = await changeTrackerWorkTasks(
    { ...input, onDeleteLocalWorkTask: input.onDeleteAnnotationTask },
    input.onRemoveFromSprint
  );
  if (workError) {
    return { error: workError, ok: false };
  }
  deleteFeatureLaneRowAnnotations(input);
  input.onRemoveBoardRow(input.rowId);
  return { ok: true };
}

/**
 * Что положить в документ целевого спринта: черновик — с его `issueKeys`,
 * строку Трекера — с именем закрепа или родителя из проекции.
 */
export function resolveFeatureLaneTransferRow(
  rowId: string,
  lanes: FeatureLanesDocument | undefined,
  rowMetaById: ReadonlyMap<string, Pick<FeatureSwimlaneRowMeta, 'parent'>>
): FeatureLaneTransferRow {
  const stored = lanes?.draftRows.find((row) => row.id === rowId);
  const name = stored?.name ?? rowMetaById.get(rowId)?.parent?.display?.trim() ?? '';
  const issueKeys = isFeatureLaneDraftRowId(rowId) ? stored?.issueKeys : undefined;
  return issueKeys?.length
    ? { id: rowId, issueKeys, name: name || rowId }
    : { id: rowId, name: name || rowId };
}

interface FeatureLaneTargetLanesIo {
  onLoadLanes: (sprintId: number) => Promise<FeatureLanesDocument | null>;
  onSaveLanes: (sprintId: number, lanes: FeatureLanesDocument) => Promise<void>;
}

/** Дописывает строку в `feature_lanes` целевого спринта (без записи, если она там уже есть). */
async function transferFeatureLaneRowToSprint(
  input: FeatureLaneTargetLanesIo & { row: FeatureLaneTransferRow; targetSprintId: number }
): Promise<void> {
  const current = (await input.onLoadLanes(input.targetSprintId)) ?? emptyFeatureLanesDocument();
  const next = transferFeatureLaneRowToDocument(current, input.row);
  if (next !== current) {
    await input.onSaveLanes(input.targetSprintId, next);
  }
}

/**
 * Переносит фичу в другой спринт целиком: задачи Трекера, строку в `feature_lanes`
 * целевого спринта (закреп / черновик с `issueKeys`) и заметки/фото/схемы, без удаления.
 * Строку пишем до заметок: заметка рисуется только на строке с id = ключу родителя.
 */
export async function submitMovedFeatureLane(
  input: FeatureLaneRowSprintChangeInput &
    FeatureLaneTargetLanesIo & {
      targetSprintId: number;
      transferRow: FeatureLaneTransferRow;
      onCommentsLeftSprint: (commentIds: string[]) => void;
      onMoveComments: (commentIds: string[], targetSprintId: number) => Promise<void>;
      onMoveToSprint: (taskId: string, sprintId: number) => Promise<void>;
    }
): Promise<FeatureLaneRowSprintChangeResult> {
  if (!canMoveFeatureLane(input.rowId, input.sprintId)) {
    return { ok: true };
  }
  const workError = await changeTrackerWorkTasks(input, (taskId) =>
    input.onMoveToSprint(taskId, input.targetSprintId)
  );
  if (workError) {
    return { error: workError, ok: false };
  }
  const commentIds = collectFeatureLaneRowComments(input.rowId, input.comments).map(
    (comment) => comment.id
  );
  try {
    await transferFeatureLaneRowToSprint({ ...input, row: input.transferRow });
    if (commentIds.length > 0) {
      await input.onMoveComments(commentIds, input.targetSprintId);
    }
  } catch {
    return { error: input.failedMessage, ok: false };
  }
  input.onCommentsLeftSprint(commentIds);
  input.onRemoveBoardRow(input.rowId);
  return { ok: true };
}
