import type { Task, TaskPosition } from '@/types';
import type { ChangelogEntry } from '@/types/tracker';

import { occupancyPlanEndCell } from '@/features/sprint/utils/occupancyUtils';
import { dateTimeToFractionalCellInRange } from '@/lib/planner-timeline';

function findReadyForTestTransition(changelog: ChangelogEntry[]): string | null {
  for (const entry of changelog) {
    const statusField = entry.fields?.find((f) => f.field.id === 'status');
    if (!statusField?.to) continue;

    const toStatusKey = statusField.to.key?.toLowerCase();
    if (toStatusKey === 'readyfortest' || toStatusKey === 'readyfortesting') {
      return entry.updatedAt;
    }
  }
  return null;
}

function resolveOccupancyBaselineEndCellFromReadyForTest(input: {
  changelog: NonNullable<Parameters<typeof resolveOccupancyBaselineEndCell>[0]['changelog']>;
  plannedEndCell: number;
  sprintStartDate: Date;
  task: NonNullable<Parameters<typeof resolveOccupancyBaselineEndCell>[0]['task']>;
  totalParts: number;
}) {
  const readyForTestTime = findReadyForTestTransition(input.changelog);
  if (!readyForTestTime) return null;
  const readyForTestCell = dateTimeToFractionalCellInRange(
    input.sprintStartDate,
    new Date(readyForTestTime),
    input.totalParts
  );
  if (readyForTestCell <= input.plannedEndCell) return null;
  return Math.min(readyForTestCell, input.totalParts);
}

export function resolveOccupancyBaselineEndCell(input: {
  changelog?: ChangelogEntry[];
  effectivePosition: TaskPosition;
  plannedEndCell: number;
  sprintStartDate: Date;
  task?: Task;
  totalParts: number;
}) {
  let baselineEndCell = Math.min(
    dateTimeToFractionalCellInRange(input.sprintStartDate, new Date(), input.totalParts),
    input.totalParts
  );

  if (input.changelog && input.task && input.task.team !== 'QA') {
    const fromReadyForTest = resolveOccupancyBaselineEndCellFromReadyForTest({
      changelog: input.changelog,
      plannedEndCell: input.plannedEndCell,
      sprintStartDate: input.sprintStartDate,
      task: input.task,
      totalParts: input.totalParts,
    });
    if (fromReadyForTest != null) baselineEndCell = fromReadyForTest;
  }

  return baselineEndCell;
}

export function resolveOccupancyBaselinePlannedEndCell(
  position: TaskPosition,
  preview: Partial<TaskPosition> | undefined
) {
  const effective: TaskPosition = preview ? { ...position, ...preview } : position;
  return occupancyPlanEndCell(effective);
}
