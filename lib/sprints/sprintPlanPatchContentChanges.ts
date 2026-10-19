import type {
  SprintPlanPatchContentChange,
  SprintPlanPatchOp,
} from '@/lib/sprints/sprintPlanPatchTypes';

interface GoalText {
  goalType: 'delivery' | 'discovery';
  id: string;
  text: string;
}

interface ContentSources {
  goals: readonly GoalText[];
  notes: readonly { id: string; text: string }[];
}

function noteText(notes: ReadonlyMap<string, string>, id: string): string | null {
  return notes.get(id) ?? null;
}

function goalChange(
  op: Extract<SprintPlanPatchOp, { op: 'createGoal' | 'deleteGoal' | 'updateGoal' }>,
  goals: ReadonlyMap<string, GoalText>
): SprintPlanPatchContentChange {
  if (op.op === 'createGoal') {
    return {
      afterText: op.text,
      beforeText: null,
      goalType: op.goalType,
      kind: 'create',
      op: 'createGoal',
    };
  }
  const current = goals.get(op.id);
  if (op.op === 'deleteGoal') {
    return {
      afterText: null,
      beforeText: current?.text ?? null,
      ...(current ? { goalType: current.goalType } : {}),
      id: op.id,
      kind: 'delete',
      op: 'deleteGoal',
    };
  }
  return {
    afterText: op.text ?? current?.text ?? null,
    beforeText: current?.text ?? null,
    ...(current ? { goalType: current.goalType } : {}),
    id: op.id,
    kind: 'update',
    op: 'updateGoal',
  };
}

function noteChange(
  op: Extract<SprintPlanPatchOp, { op: 'createNote' | 'deleteNote' | 'updateNote' }>,
  notes: ReadonlyMap<string, string>
): SprintPlanPatchContentChange {
  if (op.op === 'createNote') {
    return { afterText: op.text, beforeText: null, kind: 'create', op: 'createNote' };
  }
  if (op.op === 'deleteNote') {
    return {
      afterText: null,
      beforeText: noteText(notes, op.commentId),
      id: op.commentId,
      kind: 'delete',
      op: 'deleteNote',
    };
  }
  const before = noteText(notes, op.commentId);
  return {
    afterText: op.text ?? before,
    beforeText: before,
    id: op.commentId,
    kind: 'update',
    op: 'updateNote',
  };
}

function changeForOp(
  op: SprintPlanPatchOp,
  notes: ReadonlyMap<string, string>,
  goals: ReadonlyMap<string, GoalText>
): SprintPlanPatchContentChange | null {
  if (op.op === 'createNote' || op.op === 'updateNote' || op.op === 'deleteNote') {
    return noteChange(op, notes);
  }
  if (op.op === 'createGoal' || op.op === 'updateGoal' || op.op === 'deleteGoal') {
    return goalChange(op, goals);
  }
  return null;
}

export function sprintGoalTexts(goals: {
  delivery: readonly { id: string; text: string }[];
  discovery: readonly { id: string; text: string }[];
}): Array<{ goalType: 'delivery' | 'discovery'; id: string; text: string }> {
  return [
    ...goals.delivery.map((goal) => ({
      goalType: 'delivery' as const,
      id: goal.id,
      text: goal.text,
    })),
    ...goals.discovery.map((goal) => ({
      goalType: 'discovery' as const,
      id: goal.id,
      text: goal.text,
    })),
  ];
}

/** Before/after text for note and goal ops. Position ops are omitted. */
export function buildSprintPlanPatchContentChanges(input: {
  goals: ContentSources['goals'];
  notes: ContentSources['notes'];
  ops: readonly SprintPlanPatchOp[];
}): SprintPlanPatchContentChange[] {
  const notes = new Map(input.notes.map((note) => [note.id, note.text]));
  const goals = new Map(input.goals.map((goal) => [goal.id, goal]));
  const changes: SprintPlanPatchContentChange[] = [];
  for (const op of input.ops) {
    const change = changeForOp(op, notes, goals);
    if (change) {
      changes.push(change);
    }
  }
  return changes;
}
