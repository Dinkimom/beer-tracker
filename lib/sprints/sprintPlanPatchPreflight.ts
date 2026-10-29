import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import { sprintGoalExists } from '@/lib/sprintGoals';
import { sprintCommentExists } from '@/lib/sprints/sprintCommentsRepository';

async function missingNoteTarget(
  op: Extract<SprintPlanPatchOp, { op: 'deleteNote' | 'updateNote' }>,
  index: number,
  sprintId: number
): Promise<string | null> {
  const exists = await sprintCommentExists({
    commentId: op.commentId,
    sprintId,
  });
  return exists ? null : `ops[${index}] ${op.op}: note ${op.commentId} not found`;
}

async function missingGoalTarget(
  op: Extract<SprintPlanPatchOp, { op: 'deleteGoal' | 'updateGoal' }>,
  index: number
): Promise<string | null> {
  const exists = await sprintGoalExists({ goalId: op.id });
  return exists ? null : `ops[${index}] ${op.op}: goal ${op.id} not found`;
}

function missingTargetForOp(
  op: SprintPlanPatchOp,
  index: number,
  sprintId: number
): Promise<string | null> {
  if (op.op === 'updateNote' || op.op === 'deleteNote') {
    return missingNoteTarget(op, index, sprintId);
  }
  if (op.op === 'updateGoal' || op.op === 'deleteGoal') {
    return missingGoalTarget(op, index);
  }
  if (op.op === 'deletePosition' && op.moveToSprintId === sprintId) {
    return Promise.resolve(`ops[${index}] deletePosition: moveToSprintId ${sprintId} is this sprint`);
  }
  return Promise.resolve(null);
}

/** Fail propose early when referenced notes/goals are already gone or a move targets this sprint. */
export async function assertPlanPatchTargetsExist(input: {
  ops: SprintPlanPatchOp[];
  sprintId: number;
}): Promise<void> {
  const missing: string[] = [];
  for (let index = 0; index < input.ops.length; index++) {
    const message = await missingTargetForOp(input.ops[index]!, index, input.sprintId);
    if (message) {
      missing.push(message);
    }
  }
  if (missing.length > 0) {
    throw new Error(`preflight_failed: ${missing.join('; ')}`);
  }
}
