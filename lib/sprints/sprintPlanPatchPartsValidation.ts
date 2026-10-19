import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import {
  DEFAULT_PLANNER_TIMELINE_SCALE,
  partFitsPlannerGrid,
  type PlannerTimelineScale,
} from '@/lib/plannerTimelineScale';

function scaleForPartsPerDay(partsPerDay: number): PlannerTimelineScale {
  if (partsPerDay === 2 || partsPerDay === 3 || partsPerDay === 4) {
    return { estimateUnit: 'timeslot', timeslotsPerDay: partsPerDay };
  }
  return DEFAULT_PLANNER_TIMELINE_SCALE;
}

function assertPartFits(part: number, scale: PlannerTimelineScale, path: string): void {
  if (!partFitsPlannerGrid(part, scale)) {
    throw new Error(
      `validation_failed: ${path} startPart/part ${part} is out of range for partsPerDay=${scale.timeslotsPerDay} (valid 0..${scale.timeslotsPerDay - 1})`
    );
  }
}

function assertUpsertPositionSegmentsEnvelope(
  op: Extract<SprintPlanPatchOp, { op: 'upsertPosition' }>,
  path: string
): void {
  if (!op.segments || op.segments.length === 0) {
    return;
  }
  const first = op.segments[0]!;
  const sum = op.segments.reduce((total, segment) => total + segment.duration, 0);
  if (op.startDay !== first.startDay || op.startPart !== first.startPart) {
    throw new Error(
      `validation_failed: ${path} startDay/startPart must match segments[0] when splitting into segments`
    );
  }
  if (op.duration !== sum) {
    throw new Error(
      `validation_failed: ${path} duration must equal the sum of segments[].duration (${sum})`
    );
  }
}

function assertUpsertPositionParts(
  op: Extract<SprintPlanPatchOp, { op: 'upsertPosition' }>,
  scale: PlannerTimelineScale,
  path: string
): void {
  assertPartFits(op.startPart, scale, `${path}.startPart`);
  for (let segIndex = 0; segIndex < (op.segments?.length ?? 0); segIndex++) {
    assertPartFits(
      op.segments![segIndex]!.startPart,
      scale,
      `${path}.segments[${segIndex}].startPart`
    );
  }
  assertUpsertPositionSegmentsEnvelope(op, path);
}

function assertOneOpParts(op: SprintPlanPatchOp, scale: PlannerTimelineScale, path: string): void {
  if (op.op === 'upsertPosition') {
    assertUpsertPositionParts(op, scale, path);
    return;
  }
  if (op.op === 'createNote') {
    assertPartFits(op.part, scale, `${path}.part`);
    return;
  }
  if (op.op === 'updateNote' && op.part != null) {
    assertPartFits(op.part, scale, `${path}.part`);
  }
}

/** Reject ops whose day-part indices exceed the org planner grid. */
export function assertPlanPatchOpsFitPartsPerDay(
  ops: SprintPlanPatchOp[],
  partsPerDay: number
): void {
  const scale = scaleForPartsPerDay(partsPerDay);
  for (let index = 0; index < ops.length; index++) {
    assertOneOpParts(ops[index]!, scale, `ops[${index}]`);
  }
}
