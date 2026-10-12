import type { Task } from '@/types';

import {
  resolveTaskCardSlots,
  taskCardDensityFromDuration,
  taskCardFieldsSuppressedByKind,
  type ResolvedTaskCardSlots,
  type TaskCardSlotLayout,
} from '@/lib/taskCard/taskCardSlots';

export function resolveSwimlaneTaskCardSlots(input: {
  displayDuration?: number;
  hasAssignee: boolean;
  hasEstimate: boolean;
  hasKey: boolean;
  hideParent: boolean;
  layout: TaskCardSlotLayout;
  task: Pick<
    Task,
    | 'customFieldValues'
    | 'incidentSeverity'
    | 'isLocalTask'
    | 'localDraftKind'
    | 'originalStatus'
    | 'originalStatusDisplay'
    | 'parent'
    | 'priority'
    | 'type'
  >;
}): ResolvedTaskCardSlots {
  const suppressFields = taskCardFieldsSuppressedByKind(input.task);
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
    hasSeverity: Boolean(input.task.incidentSeverity),
    hasStatus: Boolean(input.task.originalStatus?.trim() || input.task.originalStatusDisplay?.trim()),
    hasType: Boolean(input.task.type),
    layout: input.layout,
    suppressFields,
  });
}
