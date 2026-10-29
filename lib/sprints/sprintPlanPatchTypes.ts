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
      /** Move the issue to this tracker sprint after apply (card and links leave this board). */
      moveToSprintId?: number;
      op: 'deletePosition';
      taskId: string;
    } | {
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
    } | { commentId: string; op: 'deleteNote' } | { done?: boolean; id: string; op: 'updateGoal'; text?: string } | { goalType: SprintPlanPatchGoalType; op: 'createGoal'; text: string } | { id: string; op: 'deleteGoal' } | { linkId: string; op: 'deleteLink' };

/** stop = roll back the whole patch on the first failure (default); continue = skip failed ops, apply the rest. */
export type SprintPlanPatchOnError = 'continue' | 'stop';

export interface SprintPlanPatchPositionGeometry {
  assigneeId: string;
  duration: number;
  segments?: SprintPlanPatchSegment[];
  startDay: number;
  startPart: number;
}

export interface SprintPlanPatchPositionChange {
  after: SprintPlanPatchPositionGeometry | null;
  /** Calendar line after the patch. Null when the card is removed. Same shape as `schedule`. */
  afterSchedule?: string | null;
  before: SprintPlanPatchPositionGeometry | null;
  /** Calendar line before the patch. Null when the card is new. Same shape as `scheduleBefore`. */
  beforeSchedule?: string | null;
  changes: Array<'duration' | 'schedule' | 'segments'>;
  kind: 'add' | 'remove' | 'update';
  taskId: string;
}

/** Before/after text for note and goal ops. Positions stay in positionChanges. */
export interface SprintPlanPatchContentChange {
  afterText: string | null;
  beforeText: string | null;
  goalType?: 'delivery' | 'discovery';
  id?: string;
  kind: 'create' | 'delete' | 'update';
  op:
    | 'createGoal'
    | 'createNote'
    | 'deleteGoal'
    | 'deleteNote'
    | 'updateGoal'
    | 'updateNote';
}

export interface SprintPlanPatchProposeResult {
  /** Agent session the draft was recorded in (absent for dry-run). */
  agentSession?: { draftVersion: number; repliesRecorded: number; sessionId: string };
  applyToken: string;
  capacityPreview: { summary: string };
  /** Before/after text for note and goal ops in this proposal. */
  contentChanges?: SprintPlanPatchContentChange[];
  /** Sticky notes already written as pending (translucent in the planner) until apply. */
  draftNoteIds?: string[];
  expiresAt: string;
  /** Actionable agent guidance (e.g. syncToTracker when issue_not_in_sprint). */
  hints?: string[];
  ops: SprintPlanPatchOp[];
  /** False when propose skipped writing createNote drafts. */
  persistNotes: boolean;
  /**
   * Structured before/after for position ops (rollback). Prefer this over parsing schedule lines.
   */
  positionChanges?: SprintPlanPatchPositionChange[];
  proposalId: string;
  /** True when an unconfirmed proposal was discarded because replacePending=true. */
  replacedPending?: boolean;
  /** Calendar layout for upsertPosition/deletePosition tasks after simulation. */
  schedule: string[];
  /** Calendar layout for the same tasks before the patch (rollback snapshot). */
  scheduleBefore?: string[];
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
  /** onError=stop and an op failed: the whole patch was rolled back, nothing from it is applied. */
  rolledBack?: boolean;
  /** Calendar layout for upsertPosition ops after apply. */
  schedule?: string[];
  sprintId: number;
  warnings?: string[];
}
