import type {
  SprintContextCalendarDay,
  SprintContextNote,
  SprintContextPayload,
  SprintContextPosition,
} from '@/lib/sprints/sprintContextTypes';
import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';
import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import { listPlanPatchGoalPreviews } from '@/lib/sprints/sprintPlanPatchGoalPreviewRepository';
import {
  formatExistingPendingWarning,
  formatPendingProposalConflictError,
  formatReplacedPendingWarning,
  loadPendingPlanPatchSnapshot,
  pendingProposalBlocksReplace,
} from '@/lib/sprints/sprintPlanPatchPending';
import { listPlanPatchPositionPreviews } from '@/lib/sprints/sprintPlanPatchPositionPreviewRepository';
import { formatSprintPlanScheduleForTaskIds } from '@/lib/sprints/sprintPlanScheduleFormat';

interface PendingPlanPatchPositionLine {
  afterSchedule: string | null;
  beforeSchedule: string | null;
  taskId: string;
}

interface PendingPlanPatchGoalLine {
  action: PlanPatchGoalPreview['action'];
  afterText: string | null;
  beforeText: string | null;
  goalType: PlanPatchGoalPreview['goalType'];
  id: string;
}

/** Unconfirmed proposal, in the same calendar language as propose_plan_patch. */
export interface PendingPlanPatchView {
  draftNotes: Array<{ id: string; replaceAction?: 'delete' | 'update'; replacesNoteId?: string; text: string }>;
  goals: PendingPlanPatchGoalLine[];
  hint: string;
  positions: PendingPlanPatchPositionLine[];
  proposalId: string | null;
}

type PendingPlanPatchContext = Pick<
  SprintContextPayload,
  'meta' | 'notes' | 'positions' | 'sprintGoals'
>;

const PENDING_HINT =
  'Unconfirmed proposal. positions and sprintGoals in this payload are the committed board. Draft notes are notes[] with pendingApproval=true; one with replacesNoteId is your updateNote/deleteNote of that note, shown as a copy next to it until the person accepts it. propose_plan_patch with replacePending=true discards this proposal; apply_plan_patch keeps it.';

function scheduleLine(
  positions: readonly SprintContextPosition[],
  taskId: string,
  calendarDays: readonly SprintContextCalendarDay[],
  partsPerDay: number
): string | null {
  const lines = formatSprintPlanScheduleForTaskIds(
    [...positions],
    [...calendarDays],
    partsPerDay,
    new Set([taskId])
  );
  return lines[0] ?? null;
}

function previewPosition(
  preview: PlanPatchPositionPreview,
  current: readonly SprintContextPosition[]
): SprintContextPosition {
  const named = current.find((position) => position.assigneeId === preview.assigneeId);
  return {
    assigneeId: preview.assigneeId,
    ...(named?.assigneeName ? { assigneeName: named.assigneeName } : {}),
    duration: preview.duration,
    isQa: false,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    ...(preview.segments ? { segments: preview.segments } : {}),
    startDay: preview.startDay,
    startPart: preview.startPart,
    taskId: preview.taskId,
  };
}

function positionLine(
  preview: PlanPatchPositionPreview,
  input: {
    calendarDays: readonly SprintContextCalendarDay[];
    partsPerDay: number;
    positions: readonly SprintContextPosition[];
  }
): PendingPlanPatchPositionLine {
  const after = preview.remove ? null : previewPosition(preview, input.positions);
  return {
    afterSchedule: after
      ? scheduleLine([after], preview.taskId, input.calendarDays, input.partsPerDay)
      : null,
    beforeSchedule: scheduleLine(
      input.positions,
      preview.taskId,
      input.calendarDays,
      input.partsPerDay
    ),
    taskId: preview.taskId,
  };
}

function goalLine(
  preview: PlanPatchGoalPreview,
  goals: ReadonlyMap<string, { text: string }>
): PendingPlanPatchGoalLine {
  const before = goals.get(preview.goalId)?.text ?? null;
  return {
    action: preview.action,
    afterText: preview.action === 'delete' ? null : preview.text,
    beforeText: preview.action === 'create' ? null : before,
    goalType: preview.goalType,
    id: preview.goalId,
  };
}

function clip(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= 120 ? flat : `${flat.slice(0, 119)}…`;
}

/** One line per pending position, goal, and draft note. */
export function pendingPlanPatchViewLines(view: PendingPlanPatchView): string[] {
  const lines = view.positions.map(
    (position) =>
      `position ${position.taskId}: ${position.beforeSchedule ?? '(none)'} → ${position.afterSchedule ?? '(removed)'}`
  );
  for (const goal of view.goals) {
    const from = goal.beforeText ? `"${clip(goal.beforeText)}"` : '(none)';
    const to = goal.afterText ? `"${clip(goal.afterText)}"` : '(removed)';
    lines.push(`goal ${goal.action} ${goal.goalType} ${goal.id}: ${from} → ${to}`);
  }
  for (const note of view.draftNotes) {
    const of = note.replacesNoteId ? ` (${note.replaceAction ?? 'update'} of ${note.replacesNoteId})` : '';
    lines.push(`draft note ${note.id}${of}: "${clip(note.text)}"`);
  }
  return lines;
}

export function buildPendingPlanPatchView(input: {
  calendarDays: readonly SprintContextCalendarDay[];
  goalPreviews: readonly PlanPatchGoalPreview[];
  goals: ReadonlyMap<string, { text: string }>;
  notes: readonly SprintContextNote[];
  partsPerDay: number;
  positionPreviews: readonly PlanPatchPositionPreview[];
  positions: readonly SprintContextPosition[];
  proposalId: string | null;
}): PendingPlanPatchView | null {
  const draftNotes = input.notes
    .filter((note) => note.pendingApproval === true)
    .map((note) => ({
      id: note.id,
      ...(note.replacesNoteId ? { replaceAction: note.replaceAction, replacesNoteId: note.replacesNoteId } : {}),
      text: note.text,
    }));
  const positions = input.positionPreviews.map((preview) =>
    positionLine(preview, {
      calendarDays: input.calendarDays,
      partsPerDay: input.partsPerDay,
      positions: input.positions,
    })
  );
  const goals = input.goalPreviews.map((preview) => goalLine(preview, input.goals));
  if (positions.length === 0 && goals.length === 0 && draftNotes.length === 0) {
    return null;
  }
  return {
    draftNotes,
    goals,
    hint: PENDING_HINT,
    positions,
    proposalId: input.proposalId,
  };
}

function goalLookup(
  goals: SprintContextPayload['sprintGoals']
): Map<string, { text: string }> {
  const lookup = new Map<string, { text: string }>();
  for (const goal of [...goals.delivery, ...goals.discovery]) {
    lookup.set(goal.id, { text: goal.text });
  }
  return lookup;
}

export async function loadPendingPlanPatchView(input: {
  context: PendingPlanPatchContext;
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<PendingPlanPatchView | null> {
  const snapshot = await loadPendingPlanPatchSnapshot({
    organizationId: input.organizationId,
    ownerId: input.ownerId,
    sprintId: input.sprintId,
  });
  if (!snapshot) {
    return null;
  }
  const [positionPreviews, goalPreviews] = await Promise.all([
    listPlanPatchPositionPreviews({
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      sprintId: input.sprintId,
    }),
    listPlanPatchGoalPreviews({
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      sprintId: input.sprintId,
    }),
  ]);
  return buildPendingPlanPatchView({
    calendarDays: input.context.meta.calendarDays ?? [],
    goalPreviews,
    goals: goalLookup(input.context.sprintGoals),
    notes: input.context.notes,
    partsPerDay: input.context.meta.partsPerDay,
    positionPreviews,
    positions: input.context.positions,
    proposalId: snapshot.proposalId,
  });
}

function opIds(ops: readonly SprintPlanPatchOp[], pick: (op: SprintPlanPatchOp) => string | undefined): Set<string> {
  return new Set(ops.map(pick).filter((id): id is string => id !== undefined));
}

/**
 * Что из неподтверждённого драфта не переходит в новый: карточки, цели и заметки, которых новые ops
 * не трогают. Человек видел их на доске — при замене они исчезнут.
 */
export function droppedPendingLines(view: PendingPlanPatchView, ops: readonly SprintPlanPatchOp[]): string[] {
  const tasks = opIds(ops, (op) => (op.op === 'upsertPosition' || op.op === 'deletePosition' ? op.taskId : undefined));
  const goals = opIds(ops, (op) => (op.op === 'updateGoal' || op.op === 'deleteGoal' ? op.id : undefined));
  const goalTexts = opIds(ops, (op) => (op.op === 'createGoal' ? op.text.trim() : undefined));
  const notes = opIds(ops, (op) => (op.op === 'updateNote' || op.op === 'deleteNote' ? op.commentId : undefined));
  const noteTexts = opIds(ops, (op) => (op.op === 'createNote' ? op.text.trim() : undefined));
  return pendingPlanPatchViewLines({
    ...view,
    draftNotes: view.draftNotes.filter((note) =>
      note.replacesNoteId ? !notes.has(note.replacesNoteId) : !noteTexts.has(note.text.trim())
    ),
    goals: view.goals.filter((goal) =>
      goal.action === 'create' ? !goalTexts.has((goal.afterText ?? '').trim()) : !goals.has(goal.id)
    ),
    positions: view.positions.filter((position) => !tasks.has(position.taskId)),
  });
}

/** Returns whether an older proposal was discarded. Throws when replace is required. */
export async function applyPendingProposeGate(input: {
  context: PendingPlanPatchContext;
  /** Реплика агента человеку: обязательна, если замена драфта что-то из него убирает. */
  draftMessage?: string;
  ops: readonly SprintPlanPatchOp[];
  /** Гейт по своему драфту: чужие приватные драфты не мешают. */
  ownerId: string;
  persistNotes: boolean;
  proposalId: string;
  replacePending: boolean;
  warnings: string[];
}): Promise<boolean> {
  const pending = await loadPendingPlanPatchSnapshot({
    organizationId: input.context.meta.organizationId,
    ownerId: input.ownerId,
    sprintId: input.context.meta.sprintId,
  });
  if (!pending) {
    return false;
  }
  if (!input.persistNotes) {
    input.warnings.push(formatExistingPendingWarning(pending));
    return false;
  }
  if (!pendingProposalBlocksReplace(pending, input.proposalId)) {
    return false;
  }
  const view = await loadPendingViewOrNull(input.context, input.ownerId);
  if (!input.replacePending) {
    throw new Error(formatPendingProposalConflictError(pending, view ? pendingPlanPatchViewLines(view) : []));
  }
  const dropped = view ? droppedPendingLines(view, input.ops) : [];
  if (dropped.length > 0 && !input.draftMessage?.trim()) {
    throw new Error(
      [
        'draft_message_required: replacing the unconfirmed proposal removes items the person has already seen on the board, and your new ops do not carry them over:',
        ...dropped,
        'Add them to ops to keep them, or pass draftMessage telling the person what is gone and why.',
      ].join('\n')
    );
  }
  input.warnings.push(formatReplacedPendingWarning(pending));
  if (dropped.length > 0) {
    input.warnings.push(`dropped_from_pending: not carried over from the replaced proposal — ${dropped.join('; ')}`);
  }
  return true;
}

async function loadPendingViewOrNull(
  context: PendingPlanPatchContext,
  ownerId: string
): Promise<PendingPlanPatchView | null> {
  try {
    return await loadPendingPlanPatchView({
      context,
      organizationId: context.meta.organizationId,
      ownerId,
      sprintId: context.meta.sprintId,
    });
  } catch (error) {
    console.warn('[sprint-plan-patch] pending proposal detail:', error);
    return null;
  }
}
