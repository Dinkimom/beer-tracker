'use client';

import type { ChecklistItem } from '@/types/tracker';

import { useI18n } from '@/contexts/LanguageContext';

import { GoalItemBody } from './GoalItemBody';

interface GoalItemProps {
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
}

export function GoalItem(props: GoalItemProps) {
  const { t } = useI18n();
  const editingContainerClass = props.isEditing
    ? 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 -mx-0'
    : '';
  const updatingClass = props.isUpdating ? 'opacity-50' : '';

  return (
    <div
      className={`group flex items-start gap-2 py-2 px-0 rounded transition-all ${editingContainerClass} ${updatingClass}`}
    >
      <GoalItemBody {...props} t={t} />
    </div>
  );
}
