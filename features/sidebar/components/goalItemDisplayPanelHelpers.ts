import type { ChecklistItem } from '@/types/tracker';

export function canGoalItemInteract(canEdit: boolean, isUpdating: boolean): boolean {
  return canEdit && !isUpdating;
}

export function goalItemDisplayText(index: number | undefined, text: string): string {
  if (index != null && index > 0) {
    return `${index}. ${text}`;
  }
  return text;
}

export function goalItemDisplayTextClassName(item: ChecklistItem, canInteract: boolean): string {
  const checkedClass = item.checked
    ? 'text-gray-500 dark:text-gray-400 line-through'
    : 'text-gray-900 dark:text-gray-100';
  const interactClass = canInteract
    ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
    : '';
  return `flex-1 text-sm leading-relaxed min-w-0 ${checkedClass} ${interactClass}`;
}
