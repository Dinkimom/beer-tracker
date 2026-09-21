/** Discriminated plan-patch ops for MCP propose → apply (v1). */

type SprintPlanPatchGoalType = 'delivery' | 'discovery';

type SprintPlanPatchAnchor = 'bottom' | 'left' | 'right' | 'top';

interface SprintPlanPatchNoteParent {
  display: string;
  id: string;
  key: string;
  self?: string;
}

interface SprintPlanPatchSegment {
  duration: number;
  startDay: number;
  startPart: number;
}

export type SprintPlanPatchOp =
  {
      assigneeId: string;
      color?: 'blue' | 'gray' | 'green' | 'pink' | 'yellow';
      day: number;
      height?: number;
      op: 'createNote';
      parent?: SprintPlanPatchNoteParent | null;
      part: number;
      text: string;
      width?: number;
    } | {
      assigneeId: string;
      duration: number;
      isQa?: boolean;
      op: 'upsertPosition';
      segments?: SprintPlanPatchSegment[];
      startDay: number;
      startPart: number;
      taskId: string;
    } | {
      assigneeId?: string;
      color?: 'blue' | 'gray' | 'green' | 'pink' | 'yellow';
      commentId: string;
      day?: number | null;
      height?: number;
      op: 'updateNote';
      parent?: SprintPlanPatchNoteParent | null;
      part?: number | null;
      text?: string;
      width?: number;
    } | {
      fromAnchor?: SprintPlanPatchAnchor | null;
      fromTaskId: string;
      id: string;
      op: 'upsertLink';
      toAnchor?: SprintPlanPatchAnchor | null;
      toTaskId: string;
    } | {
      id: string;
      issueKeys?: string[];
      name: string;
      op: 'upsertFeatureDraft';
    } | { commentId: string; op: 'deleteNote' } | { done?: boolean; id: string; op: 'updateGoal'; text?: string } | { goalType: SprintPlanPatchGoalType; op: 'createGoal'; text: string } | { id: string; op: 'deleteGoal' } | { linkId: string; op: 'deleteLink' } | { op: 'deletePosition'; taskId: string };

export interface SprintPlanPatchProposeResult {
  applyToken: string;
  capacityPreview: { summary: string };
  /** Sticky notes already written as pending (translucent in the planner) until apply. */
  draftNoteIds?: string[];
  expiresAt: string;
  ops: SprintPlanPatchOp[];
  proposalId: string;
  sprintId: number;
  summary: string[];
}

export interface SprintPlanPatchApplyOpResult {
  detail?: string;
  error?: string;
  index: number;
  ok: boolean;
  op: SprintPlanPatchOp['op'];
}

export interface SprintPlanPatchApplyResult {
  applied: SprintPlanPatchApplyOpResult[];
  capacity?: { summary: string };
  error?: string;
  ok: boolean;
  sprintId: number;
}
