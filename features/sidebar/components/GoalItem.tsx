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
    ? 'rounded-lg border border-black/10 bg-black/[0.05] p-3 -mx-0 dark:border-white/15 dark:bg-white/[0.06]'
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
