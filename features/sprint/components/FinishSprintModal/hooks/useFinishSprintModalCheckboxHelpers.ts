import type { ChecklistItem } from '@/types/tracker';

import toast from 'react-hot-toast';

import { updateSprintGoal } from '@/lib/api/sprintGoals';
import { updateChecklistItem } from '@/lib/beerTrackerApi';

type ChecklistItemWithGoalId = ChecklistItem & {
  goalTaskId?: string;
  goalSource?: 'sprint_goals' | 'tracker';
};

export function findFinishSprintChecklistItem(
  checklistItems: ChecklistItemWithGoalId[],
  itemId: string
): ChecklistItemWithGoalId | undefined {
  return checklistItems.find((i) => i.id === itemId);
}

export function canUpdateFinishSprintCheckbox(item: ChecklistItemWithGoalId | undefined): boolean {
  if (!item) return false;
  return Boolean(item.goalTaskId || item.goalSource === 'sprint_goals');
}

export async function updateFinishSprintGoalCheckbox(
  item: ChecklistItemWithGoalId,
  checked: boolean
): Promise<boolean> {
  if (item.goalSource === 'sprint_goals') {
    return await updateSprintGoal(item.id, { checked });
  }
  return await updateChecklistItem(item.goalTaskId!, item.id, checked);
}

export function mapFinishSprintCheckboxItems(
  items: ChecklistItemWithGoalId[],
  itemId: string,
  checked: boolean
): ChecklistItemWithGoalId[] {
  return items.map((it) => (it.id === itemId ? { ...it, checked } : it));
}

export function notifyFinishSprintCheckboxFailure(): void {
  toast.error('Не удалось обновить цель');
}
