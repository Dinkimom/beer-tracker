'use client';

import type { SprintListItem } from '@/types/tracker';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
} from '@/features/context-menu/contextMenuClasses';
import { QuickAddMenuHeader } from '@/features/task/components/TaskBar/components/quickAddMenu/QuickAddMenuHeader';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

export function filterFeatureLaneMoveSprints<T extends { archived: boolean; id: number }>(
  sprints: readonly T[],
  currentSprintId: number | null
): T[] {
  return sprints.filter((sprint) => sprint.id !== currentSprintId && !sprint.archived);
}

interface FeatureLaneRowSprintPickerProps {
  currentSprintId: number | null;
  disabled: boolean;
  sprints: readonly SprintListItem[];
  onBack: () => void;
  onClose: () => void;
  onSelect: (sprintId: number) => void;
}

export function FeatureLaneRowSprintPicker({
  currentSprintId,
  disabled,
  onBack,
  onClose,
  onSelect,
  sprints,
}: FeatureLaneRowSprintPickerProps) {
  const { t } = useI18n();
  const availableSprints = filterFeatureLaneMoveSprints(sprints, currentSprintId);
  return (
    <>
      <QuickAddMenuHeader
        disabled={disabled}
        mode="existing"
        title={t('sprintPlanner.featureLanes.moveToSprintTitle')}
        onBack={onBack}
        onClose={onClose}
      />
      <div className="max-h-[300px] overflow-y-auto" role="menu">
        {availableSprints.length === 0 ? (
          <p className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
            {t('sprintPlanner.featureLanes.moveToSprintEmpty')}
          </p>
        ) : (
          availableSprints.map((sprint) => (
            <Button
              key={sprint.id}
              className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-auto !min-h-0 flex-col !items-start gap-0.5 py-2.5`}
              disabled={disabled}
              role="menuitem"
              type="button"
              variant="ghost"
              onClick={() => onSelect(sprint.id)}
            >
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatSprintListItemDisplayName(sprint)}
              </span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                {sprint.startDate && sprint.endDate
                  ? `${new Date(sprint.startDate).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })} - ${new Date(sprint.endDate).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}`
                  : t('sprintPlanner.contextMenu.sprintNoDates')}
              </span>
            </Button>
          ))
        )}
      </div>
    </>
  );
}
