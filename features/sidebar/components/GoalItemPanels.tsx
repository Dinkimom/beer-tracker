'use client';

import { Button } from '@/components/Button';

interface GoalItemEditingPanelProps {
  cancelLabel: string;
  cancelTitle: string;
  editingText: string;
  placeholder: string;
  saveLabel: string;
  saveTitle: string;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onTextChange: (text: string) => void;
}

export function GoalItemEditingPanel({
  editingText,
  onTextChange,
  onSaveEdit,
  onCancelEdit,
  placeholder,
  cancelLabel,
  saveLabel,
  cancelTitle,
  saveTitle,
}: GoalItemEditingPanelProps) {
  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0 px-3 pt-1 pb-1">
      <input
        autoFocus
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 transition-all"
        placeholder={placeholder}
        type="text"
        value={editingText}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSaveEdit();
          } else if (e.key === 'Escape') {
            onCancelEdit();
          }
        }}
      />
      <div className="flex justify-end gap-1.5">
        <Button className="px-2 py-1 text-xs" title={cancelTitle} type="button" variant="secondary" onClick={onCancelEdit}>
          {cancelLabel}
        </Button>
        <Button className="px-2 py-1 text-xs" title={saveTitle} type="button" variant="primary" onClick={onSaveEdit}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

export function shouldShowGoalCheckbox(
  showCheckbox: boolean,
  isEditing: boolean,
  isNewGoal: boolean,
  onCheckboxChange?: (checked: boolean) => void
): boolean {
  return showCheckbox && !isEditing && !isNewGoal && onCheckboxChange != null;
}
