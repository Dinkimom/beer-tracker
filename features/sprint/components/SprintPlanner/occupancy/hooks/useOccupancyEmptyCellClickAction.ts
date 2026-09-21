import type { Developer, Task, TaskPosition } from '@/types';

import {
  buildEmptyCellTaskPosition,
  canAutoAssignEmptyCellTask,
  resolveEmptyCellAnchorRect,
  resolveEmptyCellDefaultAssignee,
  resolveEmptyCellQaFlags,
} from './useOccupancyEmptyCellClickHelpers';

export function handleOccupancyEmptyCellClickAction(input: {
  cellElement: HTMLElement;
  dayIndex: number;
  developers: Developer[];
  getAnchorRect?: (cell: HTMLElement) => DOMRect;
  onOpenAssigneePicker?: (data: {
    anchorRect: DOMRect;
    position: TaskPosition;
    task: Task;
    taskName: string;
  }) => void;
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void> | void;
  partIndex: number;
  targetTask: Task;
}): void {
  const { isSyntheticQa, useQaAssignment } = resolveEmptyCellQaFlags(input.targetTask);
  const defaultAssignee = resolveEmptyCellDefaultAssignee(
    input.developers,
    input.targetTask,
    useQaAssignment
  );
  const position = buildEmptyCellTaskPosition(
    input.targetTask,
    input.dayIndex,
    input.partIndex,
    defaultAssignee
  );

  input.onPositionSave?.(
    position,
    isSyntheticQa,
    isSyntheticQa ? input.targetTask.originalTaskId : undefined
  );

  const canAutoAssign = canAutoAssignEmptyCellTask(input.developers, input.targetTask, useQaAssignment);
  if (canAutoAssign || !input.onOpenAssigneePicker) return;

  input.onOpenAssigneePicker({
    anchorRect: resolveEmptyCellAnchorRect(input.cellElement, input.getAnchorRect),
    position,
    task: input.targetTask,
    taskName: input.targetTask.name || 'Без названия',
  });
}
