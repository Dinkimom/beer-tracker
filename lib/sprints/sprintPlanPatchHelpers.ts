import type { FeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';
import type { SprintContextPosition } from '@/lib/sprints/sprintContextTypes';
import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import { emptyFeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';

interface FeatureDraftInput { id: string; issueKeys?: string[]; name: string }

function buildMergedDraftRow(
  existing: FeatureLanesDocument['draftRows'][number] | undefined,
  draft: FeatureDraftInput,
  id: string,
  name: string
): FeatureLanesDocument['draftRows'][number] {
  if (draft.issueKeys !== undefined) {
    return { id, name, issueKeys: draft.issueKeys };
  }
  if (existing?.issueKeys !== undefined) {
    return { id, name, issueKeys: existing.issueKeys };
  }
  return { id, name };
}

/** Merge upsertFeatureDraft into existing lanes without wiping other drafts. */
export function mergeFeatureDraftIntoDocument(
  existing: FeatureLanesDocument | null,
  draft: FeatureDraftInput
): FeatureLanesDocument {
  const base = existing ?? emptyFeatureLanesDocument();
  const id = draft.id.trim();
  const name = draft.name.trim();
  if (!id || !name) {
    return base;
  }
  const index = base.draftRows.findIndex((row) => row.id === id);
  const nextRow = buildMergedDraftRow(
    index >= 0 ? base.draftRows[index] : undefined,
    draft,
    id,
    name
  );
  const draftRows =
    index >= 0
      ? base.draftRows.map((row, i) => (i === index ? nextRow : row))
      : [...base.draftRows, nextRow];
  const orderIds = base.orderIds.includes(id) ? base.orderIds : [...base.orderIds, id];
  return { ...base, draftRows, orderIds };
}

function toSimPosition(
  op: Extract<SprintPlanPatchOp, { op: 'upsertPosition' }>
): SprintContextPosition {
  const position: SprintContextPosition = {
    assigneeId: op.assigneeId,
    duration: op.duration,
    isQa: op.isQa ?? false,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    startDay: op.startDay,
    startPart: op.startPart,
    taskId: op.taskId,
  };
  if (op.segments) {
    position.segments = op.segments.map((segment) => ({
      duration: segment.duration,
      startDay: segment.startDay,
      startPart: segment.startPart,
    }));
  }
  return position;
}

function copyEnrichment(
  prev: SprintContextPosition | undefined,
  next: SprintContextPosition
): SprintContextPosition {
  if (!prev) {
    return next;
  }
  if (prev.assigneeName != null) {
    next.assigneeName = prev.assigneeName;
  }
  if (prev.assigneeEmail != null) {
    next.assigneeEmail = prev.assigneeEmail;
  }
  if (prev.summary != null) {
    next.summary = prev.summary;
  }
  return next;
}

function applySimOp(
  byTask: Map<string, SprintContextPosition>,
  op: SprintPlanPatchOp
): void {
  if (op.op === 'deletePosition') {
    byTask.delete(op.taskId);
    return;
  }
  if (op.op !== 'upsertPosition') {
    return;
  }
  byTask.set(op.taskId, copyEnrichment(byTask.get(op.taskId), toSimPosition(op)));
}

/** Apply position upsert/delete ops in-memory for capacity preview. */
export function simulatePositionsAfterPatch(
  current: SprintContextPosition[],
  ops: SprintPlanPatchOp[]
): SprintContextPosition[] {
  const byTask = new Map(current.map((position) => [position.taskId, position]));
  for (const op of ops) {
    applySimOp(byTask, op);
  }
  return [...byTask.values()];
}

function summarizeOneOp(op: SprintPlanPatchOp): string {
  switch (op.op) {
    case 'upsertPosition':
      return `upsertPosition ${op.taskId} → ${op.assigneeId} day ${op.startDay} part ${op.startPart} dur ${op.duration}`;
    case 'deletePosition':
      return `deletePosition ${op.taskId}`;
    case 'createNote':
      return `createNote @${op.assigneeId} day ${op.day} part ${op.part}: ${op.text.slice(0, 60)}`;
    case 'updateNote':
      return `updateNote ${op.commentId}`;
    case 'deleteNote':
      return `deleteNote ${op.commentId}`;
    case 'upsertLink':
      return `upsertLink ${op.fromTaskId} → ${op.toTaskId}`;
    case 'deleteLink':
      return `deleteLink ${op.linkId}`;
    case 'upsertFeatureDraft':
      return `upsertFeatureDraft ${op.id} "${op.name}"`;
    case 'createGoal':
      return `createGoal ${op.goalType}: ${op.text.slice(0, 60)}`;
    case 'updateGoal':
      return `updateGoal ${op.id}`;
    case 'deleteGoal':
      return `deleteGoal ${op.id}`;
    default: {
      const _exhaustive: never = op;
      return String(_exhaustive);
    }
  }
}

export function summarizeSprintPlanPatchOps(ops: SprintPlanPatchOp[]): string[] {
  return ops.map(summarizeOneOp);
}
