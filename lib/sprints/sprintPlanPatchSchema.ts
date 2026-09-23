import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import { ZodError, z } from 'zod';

import { MAX_PLANNER_DAY_INDEX, MAX_PLANNER_DURATION_PARTS, MAX_PLANNER_PART_INDEX } from '@/constants';
import { PLANNER_COMMENT_TEXT_MAX_LENGTH } from '@/lib/comments/excalidrawCommentPayload';
import { STICKY_NOTE_COLORS } from '@/lib/comments/stickyNoteColor';

const MAX_OPS = 50;

const SegmentSchema = z.object({
  duration: z.number().int().positive().max(MAX_PLANNER_DURATION_PARTS),
  startDay: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX),
  startPart: z.number().int().min(0).max(MAX_PLANNER_PART_INDEX),
});

const NoteParentSchema = z.object({
  display: z.string().trim().min(1).max(500),
  id: z.string().trim().min(1).max(255),
  key: z.string().trim().min(1).max(255),
  self: z.string().trim().max(2000).optional(),
});

const UpsertPositionSchema = z.object({
  assigneeId: z.string().min(1).max(255),
  duration: z.number().int().positive().max(MAX_PLANNER_DURATION_PARTS),
  isQa: z.boolean().optional(),
  op: z.literal('upsertPosition'),
  segments: z.array(SegmentSchema).max(100).optional(),
  startDay: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX),
  startPart: z.number().int().min(0).max(MAX_PLANNER_PART_INDEX),
  taskId: z.string().min(1).max(255),
});

const DeletePositionSchema = z.object({
  op: z.literal('deletePosition'),
  taskId: z.string().min(1).max(255),
});

const CreateNoteSchema = z.object({
  assigneeId: z.string().min(1).max(255),
  color: z.enum(STICKY_NOTE_COLORS).optional(),
  day: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX),
  height: z.number().int().min(1).max(10).optional(),
  op: z.literal('createNote'),
  parent: NoteParentSchema.nullable().optional(),
  part: z.number().int().min(0).max(MAX_PLANNER_PART_INDEX),
  text: z.string().min(1).max(PLANNER_COMMENT_TEXT_MAX_LENGTH),
  width: z.number().int().positive().max(2000).optional(),
});

const UpdateNoteSchema = z.object({
  assigneeId: z.string().min(1).max(255).optional(),
  color: z.enum(STICKY_NOTE_COLORS).optional(),
  commentId: z.string().uuid(),
  day: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX).nullable().optional(),
  height: z.number().int().min(1).max(10).optional(),
  op: z.literal('updateNote'),
  parent: NoteParentSchema.nullable().optional(),
  part: z.number().int().min(0).max(MAX_PLANNER_PART_INDEX).nullable().optional(),
  text: z.string().min(1).max(PLANNER_COMMENT_TEXT_MAX_LENGTH).optional(),
  width: z.number().int().positive().max(2000).optional(),
});

const DeleteNoteSchema = z.object({
  commentId: z.string().uuid(),
  op: z.literal('deleteNote'),
});

const AnchorSchema = z.enum(['left', 'right', 'top', 'bottom']);

const UpsertLinkSchema = z.object({
  fromAnchor: AnchorSchema.nullable().optional(),
  fromTaskId: z
    .string()
    .min(1)
    .max(255)
    .describe('Board card id: tracker issue key, or comment:{notes[].id} (raw notes[].id is rewritten)'),
  id: z.string().min(1).max(255),
  op: z.literal('upsertLink'),
  toAnchor: AnchorSchema.nullable().optional(),
  toTaskId: z
    .string()
    .min(1)
    .max(255)
    .describe('Board card id: tracker issue key, or comment:{notes[].id} (raw notes[].id is rewritten)'),
});

const DeleteLinkSchema = z.object({
  linkId: z.string().min(1).max(255),
  op: z.literal('deleteLink'),
});

const UpsertFeatureDraftSchema = z.object({
  id: z.string().trim().min(1).max(80),
  issueKeys: z.array(z.string().trim().min(1).max(80)).max(500).optional(),
  name: z.string().trim().min(1).max(255),
  op: z.literal('upsertFeatureDraft'),
});

const CreateGoalSchema = z.object({
  goalType: z.enum(['delivery', 'discovery']),
  op: z.literal('createGoal'),
  text: z.string().trim().min(1).max(2000),
});

const UpdateGoalSchema = z.object({
  done: z.boolean().optional(),
  id: z.string().uuid(),
  op: z.literal('updateGoal'),
  text: z.string().trim().min(1).max(2000).optional(),
});

const DeleteGoalSchema = z.object({
  id: z.string().uuid(),
  op: z.literal('deleteGoal'),
});

const SprintPlanPatchOpSchema = z.discriminatedUnion('op', [
  UpsertPositionSchema,
  DeletePositionSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  DeleteNoteSchema,
  UpsertLinkSchema,
  DeleteLinkSchema,
  UpsertFeatureDraftSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
  DeleteGoalSchema,
]);

export const SprintPlanPatchOpsSchema = z
  .array(SprintPlanPatchOpSchema)
  .min(1)
  .max(MAX_OPS);

function assertUpdateNoteHasFields(op: SprintPlanPatchOp): void {
  if (op.op !== 'updateNote') {
    return;
  }
  const hasField =
    op.assigneeId !== undefined ||
    op.color !== undefined ||
    op.day !== undefined ||
    op.height !== undefined ||
    op.parent !== undefined ||
    op.part !== undefined ||
    op.text !== undefined ||
    op.width !== undefined;
  if (!hasField) {
    throw new ZodError([
      {
        code: 'custom',
        message: 'updateNote requires at least one field to change',
        path: ['updateNote'],
      },
    ]);
  }
}

function assertUpdateGoalHasFields(op: SprintPlanPatchOp): void {
  if (op.op !== 'updateGoal') {
    return;
  }
  if (op.done === undefined && op.text === undefined) {
    throw new ZodError([
      {
        code: 'custom',
        message: 'updateGoal requires text and/or done',
        path: ['updateGoal'],
      },
    ]);
  }
}

export function parseSprintPlanPatchOps(raw: unknown): SprintPlanPatchOp[] {
  const ops = SprintPlanPatchOpsSchema.parse(raw) as SprintPlanPatchOp[];
  for (const op of ops) {
    assertUpdateNoteHasFields(op);
    assertUpdateGoalHasFields(op);
  }
  return ops;
}

export const SPRINT_PLAN_PATCH_MAX_OPS = MAX_OPS;
