import type { Task, TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { positionToEndCell } from '@/features/sprint/utils/occupancyUtils';
import { isQaOnlyTask } from '@/features/task/utils/taskUtils';

import { resolveOccupancyAddPhaseTargetTask } from './occupancyLinkButtonHelpers';

interface OccupancyHoveredTimelineCell {
  dayIndex: number;
  partIndex: number;
  taskId: string;
}

function resolveAddPhaseSlotTargetTask(
  hoveredCell: OccupancyHoveredTimelineCell,
  task: Task,
  position: TaskPosition | undefined,
  qaTask: Task | undefined,
  qaPosition: TaskPosition | undefined
): Task | null {
  const startCell = hoveredCell.dayIndex * PARTS_PER_DAY + hoveredCell.partIndex;
  const devPhaseEndCell = position ? positionToEndCell(position) : 0;
  return resolveOccupancyAddPhaseTargetTask(
    task,
    position,
    qaTask,
    qaPosition,
    startCell,
    devPhaseEndCell
  );
}

export function resolveOccupancyAddPhaseHoverSlotKind(
  hoveredCell: OccupancyHoveredTimelineCell | null,
  task: Task,
  totalParts: number,
  position: TaskPosition | undefined,
  qaTask: Task | undefined,
  qaPosition: TaskPosition | undefined,
  isDraggingDev: boolean
): 'dev' | 'qa' | null {
  if (!hoveredCell || hoveredCell.taskId !== task.id || totalParts <= 0) return null;

  const targetTask = resolveAddPhaseSlotTargetTask(
    hoveredCell,
    task,
    position,
    qaTask,
    qaPosition
  );
  if (!targetTask) return null;

  const isTargetQa = targetTask.team === 'QA' || isQaOnlyTask(targetTask);
  if (isDraggingDev && isTargetQa) return null;
  return isTargetQa ? 'qa' : 'dev';
}
