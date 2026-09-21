/**
 * Компонент списка целей
 */

import type { ChecklistItem } from '@/types/tracker';

import { GoalItem } from '@/features/sidebar/components/GoalItem';

interface GoalsListProps {
  canEdit: boolean;
  checklistItems: ChecklistItem[];
  deletingItems: Map<string, ChecklistItem>;
  editingId: string | null;
  editingText: string;
  isAdding: boolean;
  newGoalId: string | null;
  updatingItems: Set<string>;
  onCancelEdit: () => void;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  onDeleteGoal: (itemId: string) => void;
  onSaveEdit: () => void;
  onStartEdit: (item: ChecklistItem) => void;
  onTextChange: (text: string) => void;
}

export function GoalsList({
  canEdit,
  checklistItems,
  deletingItems,
  editingId,
  editingText,
  isAdding,
  newGoalId,
  onCancelEdit,
  onCheckboxChange,
  onDeleteGoal,
  onSaveEdit,
  onStartEdit,
  onTextChange,
  updatingItems,
}: GoalsListProps) {
  const total = checklistItems.length;
  const completed = checklistItems.filter((i) => i.checked).length;
  const displayTotal = total || (newGoalId ? 1 : 0);

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-2 mt-3 mb-3">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden min-w-0">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: displayTotal ? `${(completed / displayTotal) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums flex-shrink-0">
          {completed}/{displayTotal}
        </span>
      </div>
      {checklistItems.length === 0 && !newGoalId ? null : (
        <div className="space-y-0.5">
          {/* Показываем все цели из списка */}
          {checklistItems.map((item, index) => {
            const isDeleting = deletingItems.has(item.id);
            const isAnotherGoalEditing = editingId !== null && editingId !== item.id;
            return (
              <GoalItem
                key={item.id}
                canEdit={canEdit && !isAnotherGoalEditing}
                editingText={editingText}
                index={index + 1}
                isEditing={editingId === item.id}
                isUpdating={updatingItems.has(item.id) || isDeleting}
                item={item}
                onCancelEdit={onCancelEdit}
                onCheckboxChange={(checked) => onCheckboxChange(item.id, checked)}
                onDeleteGoal={() => onDeleteGoal(item.id)}
                onSaveEdit={onSaveEdit}
                onStartEdit={() => onStartEdit(item)}
                onTextChange={onTextChange}
              />
            );
          })}
          {/* Показываем удаляемые цели, которых уже нет в списке */}
          {Array.from(deletingItems.entries())
            .filter(([id]) => !checklistItems.some(item => item.id === id))
            .map(([id, item]) => (
              <GoalItem
                key={id}
                canEdit={canEdit}
                editingText=""
                index={0}
                isEditing={false}
                isUpdating={true}
                item={item}
                onCancelEdit={() => {}}
                onCheckboxChange={() => {}}
                onDeleteGoal={() => {}}
                onSaveEdit={() => {}}
                onStartEdit={() => {}}
                onTextChange={() => {}}
              />
            ))}
          {/* Отображаем новую цель в режиме редактирования в конце списка */}
          {newGoalId && (
            <GoalItem
              key={newGoalId}
              canEdit={canEdit}
              editingText={editingText}
              index={checklistItems.length + 1}
              isEditing={editingId === newGoalId}
              isUpdating={isAdding}
              item={{
                id: newGoalId,
                text: '',
                checked: false,
                checklistItemType: 'standard',
              }}
              onCancelEdit={onCancelEdit}
              onCheckboxChange={() => {}}
              onDeleteGoal={() => {}}
              onSaveEdit={onSaveEdit}
              onStartEdit={() => {}}
              onTextChange={onTextChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

