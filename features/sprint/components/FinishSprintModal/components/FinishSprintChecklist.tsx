/**
 * Компонент списка целей в модалке завершения спринта
 */

import type { ChecklistItem } from '@/types/tracker';

import { GoalItem } from '@/features/sidebar/components/GoalItem';

interface FinishSprintChecklistProps {
  checklistItems: ChecklistItem[];
  updatingItems: Set<string>;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
}

export function FinishSprintChecklist({
  checklistItems,
  updatingItems,
  onCheckboxChange,
}: FinishSprintChecklistProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Цели спринта
      </h3>
      <div className="space-y-2">
        {checklistItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Цели отсутствуют
          </p>
        ) : (
          checklistItems.map((item) => (
            <GoalItem
              key={item.id}
              canEdit={false}
              isUpdating={updatingItems.has(item.id)}
              item={item}
              showCheckbox={true}
              onCheckboxChange={(checked) => onCheckboxChange(item.id, checked)}
            />
          ))
        )}
      </div>
    </div>
  );
}

