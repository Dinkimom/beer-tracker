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
  if (op.segments !== undefined) {
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

function formatPositionAnchor(
  position: Pick<SprintContextPosition, 'assigneeId' | 'duration' | 'startDay' | 'startPart'>
): string {
  return `${position.assigneeId} day ${position.startDay} part ${position.startPart} dur ${position.duration}`;
}

function summarizeUpsertPosition(
  op: Extract<SprintPlanPatchOp, { op: 'upsertPosition' }>,
  currentByTask: ReadonlyMap<string, SprintContextPosition> | undefined
): string {
  let segmentsNote = '';
  if (op.segments !== undefined) {
    segmentsNote =
      op.segments.length === 0 ? ' (clear segments)' : ` (${op.segments.length} segments)`;
  }
  const syncNote = op.syncToTracker ? ' +syncToTracker' : '';
  const after = `${op.assigneeId} day ${op.startDay} part ${op.startPart} dur ${op.duration}`;
  const before = currentByTask?.get(op.taskId);
  const from = before ? formatPositionAnchor(before) : '(none)';
  return `upsertPosition ${op.taskId}: ${from} → ${after}${segmentsNote}${syncNote}`;
}

function clipText(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= 80 ? flat : `${flat.slice(0, 79)}…`;
}

function quotedText(text: string | undefined): string {
  return text ? `"${clipText(text)}"` : '(none)';
}

interface SprintPlanPatchSummaryLookups {
  goals?: ReadonlyMap<string, string>;
  notes?: ReadonlyMap<string, string>;
}

function summarizeUpdateNote(
  op: Extract<SprintPlanPatchOp, { op: 'updateNote' }>,
  lookups: SprintPlanPatchSummaryLookups | undefined
): string {
  if (op.text == null) {
    return `updateNote ${op.commentId}`;
  }
  return `updateNote ${op.commentId}: ${quotedText(lookups?.notes?.get(op.commentId))} → ${quotedText(op.text)}`;
}

function summarizeUpdateGoal(
  op: Extract<SprintPlanPatchOp, { op: 'updateGoal' }>,
  lookups: SprintPlanPatchSummaryLookups | undefined
): string {
  if (op.text == null) {
    return `updateGoal ${op.id}`;
  }
  return `updateGoal ${op.id}: ${quotedText(lookups?.goals?.get(op.id))} → ${quotedText(op.text)}`;
}

function summarizeDeleteNote(
  op: Extract<SprintPlanPatchOp, { op: 'deleteNote' }>,
  lookups: SprintPlanPatchSummaryLookups | undefined
): string {
  const before = lookups?.notes?.get(op.commentId);
  if (!before) {
    return `deleteNote ${op.commentId}`;
  }
  return `deleteNote ${op.commentId}: ${quotedText(before)} → (removed)`;
}

function summarizeDeleteGoal(
  op: Extract<SprintPlanPatchOp, { op: 'deleteGoal' }>,
  lookups: SprintPlanPatchSummaryLookups | undefined
): string {
  const before = lookups?.goals?.get(op.id);
  if (!before) {
    return `deleteGoal ${op.id}`;
  }
  return `deleteGoal ${op.id}: ${quotedText(before)} → (removed)`;
}

function summarizeDeletePosition(
  op: Extract<SprintPlanPatchOp, { op: 'deletePosition' }>,
  currentByTask: ReadonlyMap<string, SprintContextPosition> | undefined
): string {
  const before = currentByTask?.get(op.taskId);
  if (!before) {
    return `deletePosition ${op.taskId}`;
  }
  return `deletePosition ${op.taskId}: ${formatPositionAnchor(before)} → (removed)`;
}

function summarizeOneOp(
  op: SprintPlanPatchOp,
  currentByTask: ReadonlyMap<string, SprintContextPosition> | undefined,
  lookups: SprintPlanPatchSummaryLookups | undefined
): string {
  switch (op.op) {
    case 'upsertPosition':
      return summarizeUpsertPosition(op, currentByTask);
    case 'deletePosition':
      return summarizeDeletePosition(op, currentByTask);
    case 'createNote':
      return `createNote @${op.assigneeId} day ${op.day} part ${op.part}: ${op.text.slice(0, 60)}`;
    case 'updateNote':
      return summarizeUpdateNote(op, lookups);
    case 'deleteNote':
      return summarizeDeleteNote(op, lookups);
    case 'upsertLink':
      return `upsertLink ${op.fromTaskId} → ${op.toTaskId}`;
    case 'deleteLink':
      return `deleteLink ${op.linkId}`;
    case 'upsertFeatureDraft':
      return `upsertFeatureDraft ${op.id} "${op.name}"`;
    case 'createGoal':
      return `createGoal ${op.goalType}: ${op.text.slice(0, 60)}`;
    case 'updateGoal':
      return summarizeUpdateGoal(op, lookups);
    case 'deleteGoal':
      return summarizeDeleteGoal(op, lookups);
    default: {
      const _exhaustive: never = op;
      return String(_exhaustive);
    }
  }
}

export function sprintPlanPatchSummaryLookups(
  goals: readonly { id: string; text: string }[],
  notes: readonly { id: string; text: string }[]
): SprintPlanPatchSummaryLookups {
  return {
    goals: new Map(goals.map((goal) => [goal.id, goal.text])),
    notes: new Map(notes.map((note) => [note.id, note.text])),
  };
}

export function summarizeSprintPlanPatchOps(
  ops: SprintPlanPatchOp[],
  currentPositions?: readonly SprintContextPosition[],
  lookups?: SprintPlanPatchSummaryLookups
): string[] {
  const currentByTask =
    currentPositions == null
      ? undefined
      : new Map(currentPositions.map((position) => [position.taskId, position]));
  return ops.map((op) => summarizeOneOp(op, currentByTask, lookups));
}
