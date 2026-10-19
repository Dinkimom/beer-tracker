/** Discriminated plan-patch ops for MCP propose → apply (v1). */

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

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
      color?: StickyNoteColor;
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
      /** When true, add issue to tracker sprint and assign (BT position always written). */
      syncToTracker?: boolean;
      taskId: string;
    } | {
      assigneeId?: string;
      color?: StickyNoteColor;
      commentId: string;
      day?: number | null;
      height?: number;
      /** Fail update when note.version differs (optimistic lock). */
      ifVersion?: number;
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

/** stop = halt on first failure (default); continue = apply remaining ops. */
export type SprintPlanPatchOnError = 'continue' | 'stop';

export interface SprintPlanPatchProposeResult {
  applyToken: string;
  capacityPreview: { summary: string };
  /** Sticky notes already written as pending (translucent in the planner) until apply. */
  draftNoteIds?: string[];
  expiresAt: string;
  /** Actionable agent guidance (e.g. syncToTracker when issue_not_in_sprint). */
  hints?: string[];
  ops: SprintPlanPatchOp[];
  /** False when propose skipped writing createNote drafts. */
  persistNotes: boolean;
  proposalId: string;
  /** Calendar layout for upsertPosition ops after simulation (dates + partsPerDay). */
  schedule: string[];
  sprintId: number;
  summary: string[];
  warnings?: string[];
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
  onError?: SprintPlanPatchOnError;
  /** Calendar layout for upsertPosition ops after apply. */
  schedule?: string[];
  sprintId: number;
  warnings?: string[];
}
