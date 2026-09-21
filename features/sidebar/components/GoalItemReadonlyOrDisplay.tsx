'use client';

import type { ChecklistItem } from '@/types/tracker';

import { GoalItemDisplayPanel } from './GoalItemDisplayPanel';
import { goalItemDisplayText } from './goalItemDisplayPanelHelpers';
import { GoalItemEditingPanel } from './GoalItemPanels';

function isGoalItemEditingMode(
  isEditing: boolean | undefined,
  onSaveEdit: (() => void) | undefined,
  onCancelEdit: (() => void) | undefined,
  onTextChange: ((text: string) => void) | undefined,
): boolean {
  return Boolean(isEditing && onSaveEdit && onCancelEdit && onTextChange);
}

function hasGoalItemDisplayActions(
  onStartEdit: (() => void) | undefined,
  onDeleteGoal: (() => void) | undefined,
): boolean {
  return Boolean(onStartEdit && onDeleteGoal);
}

function goalItemReadonlyTextClassName(item: ChecklistItem): string {
  const checkedClass = item.checked
    ? 'text-gray-500 dark:text-gray-400 line-through'
    : 'text-gray-900 dark:text-gray-100';
  return `flex-1 text-sm leading-relaxed min-w-0 ${checkedClass}`;
}

interface GoalItemReadonlyOrDisplayProps {
  canEdit?: boolean;
  editingText?: string;
  index?: number;
  isEditing?: boolean;
  isUpdating: boolean;
  item: ChecklistItem;
  onCancelEdit?: () => void;
  onDeleteGoal?: () => void;
  onSaveEdit?: () => void;
  onStartEdit?: () => void;
  onTextChange?: (text: string) => void;
  t: (key: string) => string;
}

export function GoalItemReadonlyOrDisplay(props: GoalItemReadonlyOrDisplayProps) {
  const { onSaveEdit, onCancelEdit, onTextChange, onStartEdit, onDeleteGoal } = props;

  if (isGoalItemEditingMode(props.isEditing, onSaveEdit, onCancelEdit, onTextChange)) {
    return (
      <GoalItemEditingPanel
        cancelLabel={props.t('sidebar.goalItem.cancel')}
        cancelTitle={props.t('sidebar.goalItem.cancelTitle')}
        editingText={props.editingText ?? ''}
        placeholder={props.t('sidebar.goalItem.placeholder')}
        saveLabel={props.t('sidebar.goalItem.save')}
        saveTitle={props.t('sidebar.goalItem.saveTitle')}
        onCancelEdit={onCancelEdit!}
        onSaveEdit={onSaveEdit!}
        onTextChange={onTextChange!}
      />
    );
  }

  if (hasGoalItemDisplayActions(onStartEdit, onDeleteGoal)) {
    return (
      <GoalItemDisplayPanel
        canEdit={props.canEdit ?? false}
        clickToEditTitle={props.t('sidebar.goalItem.clickToEdit')}
        deleteAria={props.t('sidebar.goalItem.deleteAria')}
        deleteTitle={props.t('sidebar.goalItem.deleteTitle')}
        editAria={props.t('sidebar.goalItem.editAria')}
        editTitle={props.t('sidebar.goalItem.editTitle')}
        index={props.index}
        isUpdating={props.isUpdating}
        item={props.item}
        onDeleteGoal={onDeleteGoal!}
        onStartEdit={onStartEdit!}
      />
    );
  }

  return (
    <span className={goalItemReadonlyTextClassName(props.item)}>
      {goalItemDisplayText(props.index, props.item.text)}
    </span>
  );
}
