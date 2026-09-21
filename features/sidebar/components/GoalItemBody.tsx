'use client';

import type { ChecklistItem } from '@/types/tracker';

import { shouldShowGoalCheckbox } from './GoalItemPanels';
import { GoalItemReadonlyOrDisplay } from './GoalItemReadonlyOrDisplay';

interface GoalItemBodyProps {
  canEdit?: boolean;
  editingText?: string;
  index?: number;
  isEditing?: boolean;
  isUpdating: boolean;
  item: ChecklistItem;
  showCheckbox?: boolean;
  onCancelEdit?: () => void;
  onCheckboxChange?: (checked: boolean) => void;
  onDeleteGoal?: () => void;
  onSaveEdit?: () => void;
  onStartEdit?: () => void;
  onTextChange?: (text: string) => void;
  t: (key: string) => string;
}

export function GoalItemBody({
  item,
  isUpdating,
  isEditing = false,
  editingText = '',
  canEdit = false,
  index,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onTextChange,
  onCheckboxChange,
  onDeleteGoal,
  showCheckbox = true,
  t,
}: GoalItemBodyProps) {
  const isNewGoal = item.id.startsWith('new-');
  const showCheckboxInput = shouldShowGoalCheckbox(showCheckbox, isEditing, isNewGoal, onCheckboxChange);

  if (showCheckboxInput) {
    return (
      <>
        <input
          checked={item.checked}
          className="w-4 h-4 accent-blue-600 dark:accent-blue-500 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={isUpdating}
          style={{ marginTop: 2 }}
          type="checkbox"
          onChange={(e) => onCheckboxChange!(e.target.checked)}
        />
        <GoalItemReadonlyOrDisplay
          canEdit={canEdit}
          editingText={editingText}
          index={index}
          isEditing={isEditing}
          isUpdating={isUpdating}
          item={item}
          t={t}
          onCancelEdit={onCancelEdit}
          onDeleteGoal={onDeleteGoal}
          onSaveEdit={onSaveEdit}
          onStartEdit={onStartEdit}
          onTextChange={onTextChange}
        />
      </>
    );
  }

  return (
    <>
      {(!showCheckbox || isNewGoal) && !isEditing ? (
        <div className="w-4 h-4 flex-shrink-0" style={{ marginTop: 2 }} />
      ) : null}
      <GoalItemReadonlyOrDisplay
        canEdit={canEdit}
        editingText={editingText}
        index={index}
        isEditing={isEditing}
        isUpdating={isUpdating}
        item={item}
        t={t}
        onCancelEdit={onCancelEdit}
        onDeleteGoal={onDeleteGoal}
        onSaveEdit={onSaveEdit}
        onStartEdit={onStartEdit}
        onTextChange={onTextChange}
      />
    </>
  );
}
