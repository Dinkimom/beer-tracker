import type { Task } from '@/types';

import {
  resolveTaskCardSlots,
  taskCardDensityFromDuration,
  taskCardBoardFieldsOutsideSlots,
  taskCardFieldsSuppressedByKind,
  type ResolvedTaskCardSlots,
  type TaskCardBoard,
  type TaskCardSlotLayout,
} from '@/lib/taskCard/taskCardSlots';

export function resolveSwimlaneTaskCardSlots(input: {
  board?: TaskCardBoard;
  displayDuration?: number;
  hasAssignee: boolean;
  hasEstimate: boolean;
  hasKey: boolean;
  hideParent: boolean;
  layout: TaskCardSlotLayout;
  task: Pick<
    Task,
    | 'customFieldValues'
    | 'isLocalTask'
    | 'localDraftKind'
    | 'originalStatus'
    | 'originalStatusDisplay'
    | 'parent'
    | 'priority'
    | 'type'
  >;
}): ResolvedTaskCardSlots {
  const suppressFields = [
    ...taskCardFieldsSuppressedByKind(input.task),
    ...taskCardBoardFieldsOutsideSlots(input.board ?? 'swimlane'),
  ];
  if (input.hideParent) {
    suppressFields.push('parent');
  }
  return resolveTaskCardSlots({
    customFieldValues: input.task.customFieldValues,
    density: taskCardDensityFromDuration(input.displayDuration),
    hasAssignee: input.hasAssignee,
    hasEstimate: input.hasEstimate,
    hasKey: input.hasKey,
    hasParent: Boolean(input.task.parent),
    hasPriority: Boolean(input.task.priority),
    hasStatus: Boolean(input.task.originalStatus?.trim() || input.task.originalStatusDisplay?.trim()),
    hasType: Boolean(input.task.type),
    layout: input.layout,
    suppressFields,
  });
}
