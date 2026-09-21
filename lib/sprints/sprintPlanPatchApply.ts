import type { SprintRealtimeResource } from '@/lib/realtime/sprintRealtimeTypes';
import type {
  SprintPlanPatchApplyOpResult,
  SprintPlanPatchOp,
} from '@/lib/sprints/sprintPlanPatchTypes';
import type { TaskParent } from '@/types';

import { resolvePlannerLinkEndpoints } from '@/lib/planner/plannerLinkEndpoint';
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
import { deleteTaskLink, upsertTaskLink } from '@/lib/sprints/taskLinksRepository';
import {
  deleteTaskPosition,
  replaceTaskPositionSegments,
  upsertTaskPositionRecord,
} from '@/lib/sprints/taskPositionsRepository';

const MCP_AGENT_USER_ID = 'mcp-agent';

function asParent(
  parent: { display: string; id: string; key: string; self?: string } | null | undefined
): TaskParent | null {
  if (!parent) {
    return null;
  }
  const result: TaskParent = {
    display: parent.display,
    id: parent.id,
    key: parent.key,
  };
  if (parent.self) {
    result.self = parent.self;
  }
  return result;
}

async function applyUpsertPosition(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'upsertPosition' }>;
  sprintId: number;
}): Promise<string> {
  const { op, organizationId, sprintId } = input;
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
  });
  if (op.segments !== undefined) {
    await replaceTaskPositionSegments({
      organizationId,
      segments: op.segments,
      sprintId,
      taskId: op.taskId,
    });
  }
  return `position ${op.taskId}`;
}

async function applyCreateNote(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'createNote' }>;
  sprintId: number;
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
    createdBy: MCP_AGENT_USER_ID,
    day: op.day,
    height: size.height,
    kind: 'text',
    organizationId,
    parent: asParent(op.parent),
    part: op.part,
    sprintId,
    text: op.text,
    width: size.width,
    x: null,
    y: null,
  });
  const id =
    inserted && typeof inserted === 'object' && 'id' in inserted
      ? String((inserted as { id: unknown }).id)
      : 'unknown';
  return `note ${id}`;
}

async function applyUpdateNote(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'updateNote' }>;
  sprintId: number;
}): Promise<string> {
  const { op, organizationId, sprintId } = input;
  const parentProvided = op.parent !== undefined;
  const { row } = await updateSprintComment({
    assigneeId: op.assigneeId,
    color: op.color,
    commentId: op.commentId,
    day: op.day,
    height: op.height,
    organizationId,
    parent: parentProvided ? asParent(op.parent) : undefined,
    parentProvided,
    part: op.part,
    sprintId,
    text: op.text,
    width: op.width,
    x: undefined,
    y: undefined,
  });
  if (!row) {
    throw new Error(`note ${op.commentId} not found`);
  }
  return `note ${op.commentId}`;
}

async function applyUpsertFeatureDraft(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'upsertFeatureDraft' }>;
  sprintId: number;
}): Promise<string> {
  const existing = await fetchFeatureLanes({
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  const lanes = mergeFeatureDraftIntoDocument(existing, {
    id: input.op.id,
    name: input.op.name,
    ...(input.op.issueKeys !== undefined ? { issueKeys: input.op.issueKeys } : {}),
  });
  await upsertFeatureLanes({
    lanes,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  return `featureDraft ${input.op.id}`;
}

async function applyCreateGoal(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'createGoal' }>;
  sprintId: number;
}): Promise<string> {
  const row = await insertSprintGoal({
    goalType: input.op.goalType,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    text: input.op.text,
  });
  return `goal ${row.id}`;
}

async function applyUpdateGoal(input: {
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'updateGoal' }>;
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
  });
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
  draftNoteId?: string;
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'createNote' }>;
  sprintId: number;
}): Promise<string> {
  if (input.draftNoteId) {
    return Promise.resolve(`note ${input.draftNoteId}`);
  }
  return applyCreateNote({
    organizationId: input.organizationId,
    op: input.op,
    sprintId: input.sprintId,
  });
}

async function applyUpsertLink(input: {
  commentIds?: ReadonlySet<string>;
  organizationId: string;
  op: Extract<SprintPlanPatchOp, { op: 'upsertLink' }>;
  sprintId: number;
}): Promise<string> {
  const endpoints = resolvePlannerLinkEndpoints(
    { fromTaskId: input.op.fromTaskId, toTaskId: input.op.toTaskId },
    input.commentIds ?? new Set()
  );
  await upsertTaskLink({
    fromAnchor: input.op.fromAnchor,
    fromTaskId: endpoints.fromTaskId,
    linkId: input.op.id,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    toAnchor: input.op.toAnchor,
    toTaskId: endpoints.toTaskId,
  });
  return `link ${input.op.id}`;
}

async function applyOneOp(input: {
  commentIds?: ReadonlySet<string>;
  draftNoteId?: string;
  organizationId: string;
  op: SprintPlanPatchOp;
  sprintId: number;
}): Promise<string> {
  const { op, organizationId, sprintId } = input;
  switch (op.op) {
    case 'upsertPosition':
      return applyUpsertPosition({ organizationId, op, sprintId });
    case 'deletePosition':
      await deleteTaskPosition({ organizationId, sprintId, taskId: op.taskId });
      return `position ${op.taskId}`;
    case 'createNote':
      return applyCreateNoteOrDraft({
        draftNoteId: input.draftNoteId,
        organizationId,
        op,
        sprintId,
      });
    case 'updateNote':
      return applyUpdateNote({ organizationId, op, sprintId });
    case 'deleteNote':
      await deleteSprintComment({ commentId: op.commentId, organizationId, sprintId });
      return `note ${op.commentId}`;
    case 'upsertLink':
      return applyUpsertLink({
        commentIds: input.commentIds,
        organizationId,
        op,
        sprintId,
      });
    case 'deleteLink':
      await deleteTaskLink({ linkId: op.linkId, organizationId, sprintId });
      return `link ${op.linkId}`;
    case 'upsertFeatureDraft':
      return applyUpsertFeatureDraft({ organizationId, op, sprintId });
    case 'createGoal':
      return applyCreateGoal({ organizationId, op, sprintId });
    case 'updateGoal':
      return applyUpdateGoal({ organizationId, op });
    case 'deleteGoal': {
      const deleted = await deleteSprintGoal({ goalId: op.id, organizationId });
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
      case 'deleteNote':
        set.add('comments');
        break;
      case 'upsertLink':
      case 'deleteLink':
        set.add('links');
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
}): Promise<ReadonlySet<string> | undefined> {
  if (!input.ops.some((op) => op.op === 'upsertLink')) {
    return undefined;
  }
  const commentIds = new Set(input.draftNoteIds);
  for (const id of await listSprintCommentIds({ sprintId: input.sprintId })) {
    commentIds.add(id);
  }
  return commentIds;
}

export async function applySprintPlanPatchOps(input: {
  draftNoteIds?: readonly string[];
  organizationId: string;
  ops: SprintPlanPatchOp[];
  sprintId: number;
}): Promise<{ applied: SprintPlanPatchApplyOpResult[]; error?: string }> {
  const applied: SprintPlanPatchApplyOpResult[] = [];
  const draftCursor = { index: 0 };
  const draftNoteIds = input.draftNoteIds ?? [];
  const commentIds = await collectCommentIdsForLinkOps({
    draftNoteIds,
    ops: input.ops,
    sprintId: input.sprintId,
  });
  for (let index = 0; index < input.ops.length; index++) {
    const op = input.ops[index]!;
    try {
      const detail = await applyOneOp({
        commentIds,
        draftNoteId: op.op === 'createNote' ? takeNextDraftNoteId(draftNoteIds, draftCursor) : undefined,
        organizationId: input.organizationId,
        op,
        sprintId: input.sprintId,
      });
      applied.push({ detail, index, ok: true, op: op.op });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      applied.push({ error: message, index, ok: false, op: op.op });
      return {
        applied,
        error: `stopped at op[${index}] ${op.op}: ${message}`,
      };
    }
  }
  return { applied };
}
