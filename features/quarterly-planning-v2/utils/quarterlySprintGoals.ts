import type { SprintGoalsResponse } from '@/lib/api/sprintGoals';
import type { ChecklistItem } from '@/types/tracker';

export interface SprintGoalsSummary {
  checklistDone: number;
  checklistItems: ChecklistItem[];
  checklistTotal: number;
}

export function mergeSprintGoalsResponses(
  delivery: SprintGoalsResponse | null,
  discovery: SprintGoalsResponse | null
): SprintGoalsSummary {
  const checklistItems = [
    ...(delivery?.checklistItems ?? []),
    ...(discovery?.checklistItems ?? []),
  ];
  const checklistDone = checklistItems.filter((item) => item.checked).length;
  return {
    checklistItems,
    checklistDone,
    checklistTotal: checklistItems.length,
  };
}
