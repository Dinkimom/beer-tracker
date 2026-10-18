import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

export type PlanPatchGoalAction = 'create' | 'delete' | 'update';
type PlanPatchGoalType = 'delivery' | 'discovery';

export interface PlanPatchGoalPreview {
  action: PlanPatchGoalAction;
  clientBrand?: McpOAuthClientBrand;
  done: boolean;
  goalId: string;
  goalType: PlanPatchGoalType;
  text: string;
}

interface PlanPatchGoalSource {
  done: boolean;
  goalType: PlanPatchGoalType;
  id: string;
  text: string;
}

interface GoalText {
  done: boolean;
  id: string;
  text: string;
}

interface GoalDraft {
  byId: Map<string, PlanPatchGoalPreview>;
  created: PlanPatchGoalPreview[];
  sources: Map<string, PlanPatchGoalSource>;
}

function appendGoalSources(
  sources: PlanPatchGoalSource[],
  goals: readonly GoalText[],
  goalType: PlanPatchGoalType
): void {
  for (const goal of goals) {
    sources.push({ done: goal.done, goalType, id: goal.id, text: goal.text });
  }
}

export function planPatchGoalSources(
  delivery: readonly GoalText[],
  discovery: readonly GoalText[]
): PlanPatchGoalSource[] {
  const sources: PlanPatchGoalSource[] = [];
  appendGoalSources(sources, delivery, 'delivery');
  appendGoalSources(sources, discovery, 'discovery');
  return sources;
}

function sourceMap(current: readonly PlanPatchGoalSource[]): Map<string, PlanPatchGoalSource> {
  const sources = new Map<string, PlanPatchGoalSource>();
  for (const goal of current) {
    sources.set(goal.id, goal);
  }
  return sources;
}

function withBrand(
  preview: PlanPatchGoalPreview,
  clientBrand: McpOAuthClientBrand | undefined
): PlanPatchGoalPreview {
  if (!clientBrand) {
    return preview;
  }
  return { ...preview, clientBrand };
}

function rememberCreate(
  draft: GoalDraft,
  op: Extract<SprintPlanPatchOp, { op: 'createGoal' }>,
  createId: () => string,
  clientBrand: McpOAuthClientBrand | undefined
): void {
  const text = op.text.trim();
  if (!text) {
    return;
  }
  draft.created.push(
    withBrand(
      { action: 'create', done: false, goalId: createId(), goalType: op.goalType, text },
      clientBrand
    )
  );
}

function rememberUpdate(
  draft: GoalDraft,
  op: Extract<SprintPlanPatchOp, { op: 'updateGoal' }>,
  clientBrand: McpOAuthClientBrand | undefined
): void {
  const source = draft.sources.get(op.id);
  if (!source) {
    return;
  }
  const previous = draft.byId.get(op.id);
  const text = op.text ?? previous?.text ?? source.text;
  const done = op.done ?? previous?.done ?? source.done;
  if (text === source.text && done === source.done) {
    draft.byId.delete(op.id);
    return;
  }
  draft.byId.set(
    op.id,
    withBrand(
      { action: 'update', done, goalId: source.id, goalType: source.goalType, text },
      clientBrand
    )
  );
}

function rememberDelete(
  draft: GoalDraft,
  goalId: string,
  clientBrand: McpOAuthClientBrand | undefined
): void {
  const source = draft.sources.get(goalId);
  if (!source) {
    return;
  }
  draft.byId.set(
    goalId,
    withBrand(
      {
        action: 'delete',
        done: source.done,
        goalId: source.id,
        goalType: source.goalType,
        text: source.text,
      },
      clientBrand
    )
  );
}

function applyGoalOp(
  draft: GoalDraft,
  op: SprintPlanPatchOp,
  createId: () => string,
  clientBrand: McpOAuthClientBrand | undefined
): void {
  if (op.op === 'createGoal') {
    rememberCreate(draft, op, createId, clientBrand);
    return;
  }
  if (op.op === 'updateGoal') {
    rememberUpdate(draft, op, clientBrand);
    return;
  }
  if (op.op === 'deleteGoal') {
    rememberDelete(draft, op.id, clientBrand);
  }
}

export function buildPlanPatchGoalPreviews(input: {
  clientBrand?: McpOAuthClientBrand;
  createId: () => string;
  current: readonly PlanPatchGoalSource[];
  ops: readonly SprintPlanPatchOp[];
}): PlanPatchGoalPreview[] {
  const draft: GoalDraft = {
    byId: new Map(),
    created: [],
    sources: sourceMap(input.current),
  };
  for (const op of input.ops) {
    applyGoalOp(draft, op, input.createId, input.clientBrand);
  }
  return [...draft.byId.values(), ...draft.created];
}
