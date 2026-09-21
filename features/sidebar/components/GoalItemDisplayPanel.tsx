'use client';

import type { ChecklistItem } from '@/types/tracker';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';

import {
  canGoalItemInteract,
  goalItemDisplayText,
  goalItemDisplayTextClassName,
} from './goalItemDisplayPanelHelpers';

interface GoalItemDisplayPanelProps {
  canEdit: boolean;
  clickToEditTitle: string;
  deleteAria: string;
  deleteTitle: string;
  editAria: string;
  editTitle: string;
  index?: number;
  isUpdating: boolean;
  item: ChecklistItem;
  onDeleteGoal: () => void;
  onStartEdit: () => void;
}

export function GoalItemDisplayPanel({
  item,
  index,
  canEdit,
  isUpdating,
  clickToEditTitle,
  onStartEdit,
  onDeleteGoal,
  editAria,
  editTitle,
  deleteAria,
  deleteTitle,
}: GoalItemDisplayPanelProps) {
  const canInteract = canGoalItemInteract(canEdit, isUpdating);

  return (
    <>
      <span
        className={goalItemDisplayTextClassName(item, canInteract)}
        title={canInteract ? clickToEditTitle : ''}
        onClick={() => {
          if (canInteract) {
            onStartEdit();
          }
        }}
      >
        {goalItemDisplayText(index, item.text)}
      </span>
      {canInteract ? (
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <HeaderIconButton
            aria-label={editAria}
            className="h-8 w-8 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
            title={editTitle}
            type="button"
            onClick={onStartEdit}
          >
            <Icon className="h-4 w-4" name="edit" />
          </HeaderIconButton>
          <HeaderIconButton
            aria-label={deleteAria}
            className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title={deleteTitle}
            type="button"
            onClick={onDeleteGoal}
          >
            <Icon className="h-4 w-4" name="trash" />
          </HeaderIconButton>
        </div>
      ) : null}
      {isUpdating ? (
        <div className="flex items-center flex-shrink-0">
          <Icon className="animate-spin h-4 w-4 text-gray-400 dark:text-gray-500" name="spinner" />
        </div>
      ) : null}
    </>
  );
}
