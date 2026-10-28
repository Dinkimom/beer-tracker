import type { BeerTrackerTransactionQuery } from '@/lib/db';
import type { SprintRealtimeResource } from '@/lib/realtime/sprintRealtimeTypes';
import type {
  SprintPlanPatchApplyOpResult,
  SprintPlanPatchOnError,
  SprintPlanPatchOp,
} from '@/lib/sprints/sprintPlanPatchTypes';

import { taskParentFromPatchRef } from '@/lib/comments/commentParent';
import { resolvePlannerLinkEndpoints } from '@/lib/planner/plannerLinkEndpoint';
import { plannerLinkInvolvesComment } from '@/lib/planner/plannerLinkPersistence';
import { deleteSprintGoal, insertSprintGoal, updateSprintGoal } from '@/lib/sprintGoals';
import {
  fetchFeatureLanes,
  upsertFeatureLanes,
} from '@/lib/sprints/featureLanesRepository';
import {
  deleteSprintComment,
  insertSprintComment,
  listSprintCommentIds,
  updateSprintComment,
} from '@/lib/sprints/sprintCommentsRepository';
import { mergeFeatureDraftIntoDocument } from '@/lib/sprints/sprintPlanPatchHelpers';
import { resolvePlanPatchCreateNoteSize } from '@/lib/sprints/sprintPlanPatchNoteSize';
import { syncUpsertPositionToTracker } from '@/lib/sprints/sprintPlanPatchTrackerSync';
import { deleteTaskLink, upsertTaskLink } from '@/lib/sprints/taskLinksRepository';
import {
  deleteTaskPosition,
  replaceTaskPositionSegments,
  upsertTaskPositionRecord,
} from '@/lib/sprints/taskPositionsRepository';


/** Синк позиции в трекер: выполняется после коммита транзакции, его нельзя откатить. */
export interface PlanPatchTrackerSyncRequest {
  assigneeId: string;
  index: number;
  taskId: string;
}

async function applyUpsertPosition(input: {
  index: number;
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'upsertPosition' }>;
  sprintId: number;
  trackerSyncs: PlanPatchTrackerSyncRequest[];
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  const { op, organizationId, sprintId, tx } = input;
  await upsertTaskPositionRecord({
    assigneeId: op.assigneeId,
    duration: op.duration,
    isQa: op.isQa,
    organizationId,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    sprintId,
    startDay: op.startDay,
    startPart: op.startPart,
    taskId: op.taskId,
  }, tx);
  if (op.segments !== undefined) {
    await replaceTaskPositionSegments(
      {
        organizationId,
        segments: op.segments,
        sprintId,
        taskId: op.taskId,
      },
      tx
    );
  }
  if (op.syncToTracker) {
    input.trackerSyncs.push({ assigneeId: op.assigneeId, index: input.index, taskId: op.taskId });
  }
  return `position ${op.taskId}`;
}

/** Синк в трекер после коммита: детали и предупреждения дописываются к результату операции. */
export async function runPlanPatchTrackerSyncs(input: {
  applied: SprintPlanPatchApplyOpResult[];
  organizationId: string;
  sprintId: number;
  trackerSyncs: readonly PlanPatchTrackerSyncRequest[];
}): Promise<void> {
  for (const request of input.trackerSyncs) {
    const row = input.applied.find((item) => item.index === request.index);
    if (!row?.ok) continue;
    const sync = await syncUpsertPositionToTracker({
      assigneeId: request.assigneeId,
      organizationId: input.organizationId,
      sprintId: input.sprintId,
      taskId: request.taskId,
    });
    row.detail = [row.detail, sync.detail, sync.warning].filter(Boolean).join('; ');
  }
}

async function applyCreateNote(input: {
  actorUserId: string;
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'createNote' }>;
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  const { op, organizationId, sprintId } = input;
  const size = resolvePlanPatchCreateNoteSize({
    height: op.height,
    text: op.text,
    width: op.width,
  });
  const inserted = await insertSprintComment({
    assigneeId: op.assigneeId,
    color: op.color,
    commentId: undefined,
    createdBy: input.actorUserId,
    day: op.day,
    height: size.height,
    kind: 'text',
    organizationId,
    parent: taskParentFromPatchRef(op.parent),
    part: op.part,
    sprintId,
    text: op.text,
    width: size.width,
    x: null,
    y: null,
  }, input.tx);
  const id =
    inserted && typeof inserted === 'object' && 'id' in inserted
      ? String((inserted as { id: unknown }).id)
      : 'unknown';
  return `note ${id}`;
}

async function applyUpdateNote(input: {
  actorUserId: string;
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'updateNote' }>;
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  const { op, organizationId, sprintId } = input;
  const parentProvided = op.parent !== undefined;
  const { conflict, row } = await updateSprintComment({
    assigneeId: op.assigneeId,
    color: op.color,
    commentId: op.commentId,
    day: op.day,
    height: op.height,
    ifVersion: op.ifVersion,
    organizationId,
    parent: parentProvided ? taskParentFromPatchRef(op.parent) : undefined,
    parentProvided,
    part: op.part,
    sprintId,
    text: op.text,
    updatedBy: input.actorUserId,
    width: op.width,
    x: undefined,
    y: undefined,
  }, input.tx);
  if (conflict) {
    throw new Error(`note ${op.commentId} version conflict`);
  }
  if (!row) {
    throw new Error(`note ${op.commentId} not found`);
  }
  return `note ${op.commentId}`;
}

async function applyDeleteNote(input: {
  actorUserId: string;
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'deleteNote' }>;
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  const { ok } = await deleteSprintComment({
    actorUserId: input.actorUserId,
    commentId: input.op.commentId,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  }, input.tx);
  if (!ok) {
    throw new Error(`note ${input.op.commentId} not found`);
  }
  return `note ${input.op.commentId}`;
}

async function applyUpsertFeatureDraft(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'upsertFeatureDraft' }>;
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  const existing = await fetchFeatureLanes({
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  }, input.tx);
  const lanes = mergeFeatureDraftIntoDocument(existing, {
    id: input.op.id,
    name: input.op.name,
    ...(input.op.issueKeys !== undefined ? { issueKeys: input.op.issueKeys } : {}),
  });
  await upsertFeatureLanes({
    lanes,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  }, input.tx);
  return `featureDraft ${input.op.id}`;
}

async function applyCreateGoal(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'createGoal' }>;
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  const row = await insertSprintGoal({
    goalType: input.op.goalType,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    text: input.op.text,
  }, input.tx);
  return `goal ${row.id}`;
}

async function applyUpdateGoal(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'updateGoal' }>;
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  const updateFields: string[] = [];
  const updateValues: Array<boolean | string> = [];
  let paramIndex = 1;
  if (input.op.text !== undefined) {
    updateFields.push(`text = $${paramIndex++}`);
    updateValues.push(input.op.text);
  }
  if (input.op.done !== undefined) {
    updateFields.push(`done = $${paramIndex++}`);
    updateValues.push(input.op.done);
  }
  const row = await updateSprintGoal({
    goalId: input.op.id,
    organizationId: input.organizationId,
    updateFields,
    updateValues,
  }, input.tx);
  if (!row) {
    throw new Error(`goal ${input.op.id} not found`);
  }
  return `goal ${input.op.id}`;
}

function takeNextDraftNoteId(ids: readonly string[], cursor: { index: number }): string | undefined {
  const id = ids[cursor.index];
  if (id) {
    cursor.index += 1;
  }
  return id;
}

function applyCreateNoteOrDraft(input: {
  actorUserId: string;
  draftNoteId?: string;
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'createNote' }>;
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  if (input.draftNoteId) {
    return Promise.resolve(`note ${input.draftNoteId}`);
  }
  return applyCreateNote({
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    op: input.op,
    sprintId: input.sprintId,
    tx: input.tx,
  });
}

async function applyUpsertLink(input: {
  commentIds?: ReadonlySet<string>;
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'upsertLink' }>;
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<string> {
  const endpoints = resolvePlannerLinkEndpoints(
    { fromTaskId: input.op.fromTaskId, toTaskId: input.op.toTaskId },
    input.commentIds ?? new Set()
  );
  if (!plannerLinkInvolvesComment(endpoints.fromTaskId, endpoints.toTaskId)) {
    return `link skipped ${input.op.id}`;
  }
  await upsertTaskLink({
    fromAnchor: input.op.fromAnchor,
    fromTaskId: endpoints.fromTaskId,
    linkId: input.op.id,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    toAnchor: input.op.toAnchor,
    toTaskId: endpoints.toTaskId,
  }, input.tx);
  return `link ${input.op.id}`;
}

interface ApplyOpContext {
  actorUserId: string;
  commentIds?: ReadonlySet<string>;
  draftNoteId?: string;
  index: number;
  op: SprintPlanPatchOp;
  organizationId: string;
  sprintId: number;
  trackerSyncs: PlanPatchTrackerSyncRequest[];
  tx: BeerTrackerTransactionQuery;
}

async function applyOneOp(input: ApplyOpContext): Promise<string> {
  const { op, organizationId, sprintId, tx } = input;
  switch (op.op) {
    case 'upsertPosition':
      return applyUpsertPosition({
        index: input.index,
        organizationId,
        op,
        sprintId,
        trackerSyncs: input.trackerSyncs,
        tx,
      });
    case 'deletePosition':
      await deleteTaskPosition({ organizationId, sprintId, taskId: op.taskId }, tx);
      return `position ${op.taskId}`;
    case 'createNote':
      return applyCreateNoteOrDraft({
        actorUserId: input.actorUserId,
        draftNoteId: input.draftNoteId,
        organizationId,
        op,
        sprintId,
        tx,
      });
    case 'updateNote':
      return applyUpdateNote({ actorUserId: input.actorUserId, organizationId, op, sprintId, tx });
    case 'deleteNote':
      return applyDeleteNote({ actorUserId: input.actorUserId, organizationId, op, sprintId, tx });
    case 'upsertLink':
      return applyUpsertLink({ commentIds: input.commentIds, organizationId, op, sprintId, tx });
    case 'deleteLink':
      await deleteTaskLink({ linkId: op.linkId, organizationId, sprintId }, tx);
      return `link ${op.linkId}`;
    case 'upsertFeatureDraft':
      return applyUpsertFeatureDraft({ organizationId, op, sprintId, tx });
    case 'createGoal':
      return applyCreateGoal({ organizationId, op, sprintId, tx });
    case 'updateGoal':
      return applyUpdateGoal({ organizationId, op, tx });
    case 'deleteGoal': {
      const deleted = await deleteSprintGoal({ goalId: op.id, organizationId }, tx);
      if (!deleted) {
        throw new Error(`goal ${op.id} not found`);
      }
      return `goal ${op.id}`;
    }
    default: {
      const _exhaustive: never = op;
      throw new Error(`unsupported op ${String(_exhaustive)}`);
    }
  }
}

export function collectRealtimeResources(ops: SprintPlanPatchOp[]): SprintRealtimeResource[] {
  const set = new Set<SprintRealtimeResource>();
  for (const op of ops) {
    switch (op.op) {
      case 'upsertPosition':
      case 'deletePosition':
        set.add('positions');
        break;
      case 'createNote':
      case 'updateNote':
        set.add('comments');
        break;
      case 'deleteNote':
        // deleteSprintComment убирает и стрелки к заметке.
        set.add('comments');
        set.add('links');
        break;
      case 'upsertLink':
      case 'deleteLink':
        set.add('links');
        break;
      case 'createGoal':
      case 'updateGoal':
      case 'deleteGoal':
        set.add('goals');
        break;
      default:
        break;
    }
  }
  return [...set];
}

async function collectCommentIdsForLinkOps(input: {
  draftNoteIds: readonly string[];
  ops: SprintPlanPatchOp[];
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<ReadonlySet<string> | undefined> {
  if (!input.ops.some((op) => op.op === 'upsertLink')) {
    return undefined;
  }
  const commentIds = new Set(input.draftNoteIds);
  for (const id of await listSprintCommentIds({ sprintId: input.sprintId }, input.tx)) {
    commentIds.add(id);
  }
  return commentIds;
}

/** Операция в своём savepoint: ошибка откатывает только её, транзакция остаётся живой. */
async function applyIndexedOp(input: ApplyOpContext): Promise<SprintPlanPatchApplyOpResult> {
  await input.tx('SAVEPOINT plan_patch_op');
  try {
    const detail = await applyOneOp(input);
    await input.tx('RELEASE SAVEPOINT plan_patch_op');
    return { detail, index: input.index, ok: true, op: input.op.op };
  } catch (error) {
    await input.tx('ROLLBACK TO SAVEPOINT plan_patch_op');
    const message = error instanceof Error ? error.message : String(error);
    return { error: message, index: input.index, ok: false, op: input.op.op };
  }
}

function summarizeApplyFailures(
  applied: SprintPlanPatchApplyOpResult[],
  onError: SprintPlanPatchOnError
): string | undefined {
  const failed = applied.filter((row) => !row.ok);
  if (failed.length === 0) {
    return undefined;
  }
  if (onError === 'stop') {
    const first = failed[0]!;
    return `stopped at op[${first.index}] ${first.op}: ${first.error ?? 'unknown'}; nothing applied (rolled back)`;
  }
  return `continued with ${failed.length} failed op(s)`;
}

/**
 * Применяет операции внутри транзакции `tx`. При `onError='stop'` первая ошибка прерывает цикл —
 * откатить уже выполненное должен вызывающий (бросить из транзакции). Синк в трекер не выполняется:
 * запросы на него возвращаются в `trackerSyncs` для запуска после коммита.
 */
export async function applySprintPlanPatchOps(input: {
  actorUserId: string;
  draftNoteIds?: readonly string[];
  onError?: SprintPlanPatchOnError;
  organizationId: string;
  ops: SprintPlanPatchOp[];
  sprintId: number;
  tx: BeerTrackerTransactionQuery;
}): Promise<{
  applied: SprintPlanPatchApplyOpResult[];
  error?: string;
  trackerSyncs: PlanPatchTrackerSyncRequest[];
}> {
  const applied: SprintPlanPatchApplyOpResult[] = [];
  const trackerSyncs: PlanPatchTrackerSyncRequest[] = [];
  const draftCursor = { index: 0 };
  const draftNoteIds = input.draftNoteIds ?? [];
  const onError = input.onError ?? 'stop';
  const commentIds = await collectCommentIdsForLinkOps({
    draftNoteIds,
    ops: input.ops,
    sprintId: input.sprintId,
    tx: input.tx,
  });
  for (let index = 0; index < input.ops.length; index++) {
    const op = input.ops[index]!;
    const row = await applyIndexedOp({
      actorUserId: input.actorUserId,
      commentIds,
      draftNoteId: op.op === 'createNote' ? takeNextDraftNoteId(draftNoteIds, draftCursor) : undefined,
      index,
      organizationId: input.organizationId,
      op,
      sprintId: input.sprintId,
      trackerSyncs,
      tx: input.tx,
    });
    applied.push(row);
    if (!row.ok && onError === 'stop') {
      break;
    }
  }
  return { applied, error: summarizeApplyFailures(applied, onError), trackerSyncs };
}
