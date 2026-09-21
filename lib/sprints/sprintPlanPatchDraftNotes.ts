import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';
import type { TaskParent } from '@/types';

import { randomUUID } from 'crypto';

import {
  confirmPendingSprintComments,
  deletePendingSprintCommentsByProposalId,
  insertSprintComment,
} from '@/lib/sprints/sprintCommentsRepository';
import { resolvePlanPatchCreateNoteSize } from '@/lib/sprints/sprintPlanPatchNoteSize';

const MCP_AGENT_USER_ID = 'mcp-agent';

type SprintPlanPatchCreateNoteOp = Extract<SprintPlanPatchOp, { op: 'createNote' }>;

export function collectCreateNoteOps(ops: SprintPlanPatchOp[]): SprintPlanPatchCreateNoteOp[] {
  return ops.filter((op): op is SprintPlanPatchCreateNoteOp => op.op === 'createNote');
}

function asParent(parent: SprintPlanPatchCreateNoteOp['parent']): TaskParent | null {
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

export async function persistProposedCreateNotes(input: {
  expiresAt: Date;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  proposalId: string;
  sprintId: number;
}): Promise<string[]> {
  const notes = collectCreateNoteOps(input.ops);
  await deletePendingSprintCommentsByProposalId({
    proposalId: input.proposalId,
    sprintId: input.sprintId,
  });
  const ids: string[] = [];
  for (const op of notes) {
    const commentId = randomUUID();
    const size = resolvePlanPatchCreateNoteSize({
      height: op.height,
      text: op.text,
      width: op.width,
    });
    await insertSprintComment({
      assigneeId: op.assigneeId,
      color: op.color,
      commentId,
      createdBy: MCP_AGENT_USER_ID,
      day: op.day,
      height: size.height,
      kind: 'text',
      organizationId: input.organizationId,
      parent: asParent(op.parent),
      part: op.part,
      pendingApproval: true,
      pendingApprovalExpiresAt: input.expiresAt,
      planPatchProposalId: input.proposalId,
      sprintId: input.sprintId,
      text: op.text,
      width: size.width,
      x: null,
      y: null,
    });
    ids.push(commentId);
  }
  return ids;
}

export function confirmProposedCreateNotes(input: {
  commentIds: readonly string[];
  sprintId: number;
}): Promise<number> {
  return confirmPendingSprintComments({
    commentIds: input.commentIds,
    sprintId: input.sprintId,
  });
}
