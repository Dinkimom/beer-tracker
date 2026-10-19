import type {
  SprintContextCalendarDay,
  SprintContextPosition,
} from '@/lib/sprints/sprintContextTypes';
import type { PlanPatchPreviewSourcePosition } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type {
  SprintPlanPatchOp,
  SprintPlanPatchPositionChange,
  SprintPlanPatchPositionGeometry,
} from '@/lib/sprints/sprintPlanPatchTypes';

import { buildPlanPatchPositionPreviews } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import { formatSprintPlanScheduleForTaskIds } from '@/lib/sprints/sprintPlanScheduleFormat';

function toGeometry(
  position:
    | Pick<
        SprintContextPosition,
        'assigneeId' | 'duration' | 'segments' | 'startDay' | 'startPart'
      >
    | PlanPatchPreviewSourcePosition
    | undefined
): SprintPlanPatchPositionGeometry | null {
  if (!position) {
    return null;
  }
  const geometry: SprintPlanPatchPositionGeometry = {
    assigneeId: position.assigneeId,
    duration: position.duration,
    startDay: position.startDay,
    startPart: position.startPart,
  };
  if (position.segments && position.segments.length > 0) {
    geometry.segments = position.segments.map((segment) => ({
      duration: segment.duration,
      startDay: segment.startDay,
      startPart: segment.startPart,
    }));
  }
  return geometry;
}

function kindForPreview(input: {
  before: SprintPlanPatchPositionGeometry | null;
  remove: boolean;
}): SprintPlanPatchPositionChange['kind'] {
  if (input.remove) {
    return 'remove';
  }
  if (input.before == null) {
    return 'add';
  }
  return 'update';
}

/** Structured before/after for position ops (rollback + agent review). */
export function buildSprintPlanPatchPositionChanges(input: {
  current: readonly PlanPatchPreviewSourcePosition[];
  ops: readonly SprintPlanPatchOp[];
  simulated: readonly Pick<
    SprintContextPosition,
    'assigneeId' | 'duration' | 'segments' | 'startDay' | 'startPart' | 'taskId'
  >[];
}): SprintPlanPatchPositionChange[] {
  const currentByTask = new Map(input.current.map((position) => [position.taskId, position]));
  const simulatedByTask = new Map(
    input.simulated.map((position) => [position.taskId, position])
  );
  const changes: SprintPlanPatchPositionChange[] = [];
  for (const preview of buildPlanPatchPositionPreviews({
    current: input.current,
    ops: input.ops,
  })) {
    const before = toGeometry(currentByTask.get(preview.taskId));
    const after = preview.remove
      ? null
      : toGeometry(
          simulatedByTask.get(preview.taskId) ?? {
            assigneeId: preview.assigneeId,
            duration: preview.duration,
            segments: preview.segments,
            startDay: preview.startDay,
            startPart: preview.startPart,
            taskId: preview.taskId,
          }
        );
    changes.push({
      after,
      before,
      changes: preview.changes,
      kind: kindForPreview({ before, remove: preview.remove }),
      taskId: preview.taskId,
    });
  }
  return changes;
}

function formatGeometryShort(geometry: SprintPlanPatchPositionGeometry): string {
  const base = `${geometry.assigneeId} day ${geometry.startDay} part ${geometry.startPart} dur ${geometry.duration}`;
  if (!geometry.segments || geometry.segments.length === 0) {
    return base;
  }
  return `${base} (${geometry.segments.length} segments)`;
}

function scheduleLineForTask(
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

/** Attach calendar lines (name + dates) next to raw day/part geometry. */
export function labelSprintPlanPatchPositionChanges(input: {
  calendarDays: readonly SprintContextCalendarDay[];
  changes: readonly SprintPlanPatchPositionChange[];
  current: readonly SprintContextPosition[];
  partsPerDay: number;
  simulated: readonly SprintContextPosition[];
}): SprintPlanPatchPositionChange[] {
  return input.changes.map((change) => ({
    ...change,
    afterSchedule: scheduleLineForTask(
      input.simulated,
      change.taskId,
      input.calendarDays,
      input.partsPerDay
    ),
    beforeSchedule: scheduleLineForTask(
      input.current,
      change.taskId,
      input.calendarDays,
      input.partsPerDay
    ),
  }));
}

/** Human “было → стало” lines for positionChanges. */
export function formatSprintPlanPatchPositionChangeLines(
  changes: readonly SprintPlanPatchPositionChange[]
): string[] {
  return changes.map((change) => {
    if (change.kind === 'remove') {
      const before = change.before ? formatGeometryShort(change.before) : '(missing)';
      return `${change.taskId}: ${before} → (removed)`;
    }
    if (change.kind === 'add') {
      const after = change.after ? formatGeometryShort(change.after) : '(missing)';
      return `${change.taskId}: (none) → ${after}`;
    }
    const before = change.before ? formatGeometryShort(change.before) : '(none)';
    const after = change.after ? formatGeometryShort(change.after) : '(none)';
    return `${change.taskId}: ${before} → ${after}`;
  });
}
