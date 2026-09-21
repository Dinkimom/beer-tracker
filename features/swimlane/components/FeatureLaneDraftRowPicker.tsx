'use client';

import type { QuickAddMode, QuickAddPickerItem } from '@/features/task/components/TaskBar/components/quickAddMenu/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW,
  CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_SEPARATOR,
} from '@/features/context-menu/contextMenuClasses';
import { QuickAddMenuCloseButton } from '@/features/task/components/TaskBar/components/quickAddMenu/QuickAddMenuCloseButton';
import { QuickAddMenuKindPicker } from '@/features/task/components/TaskBar/components/quickAddMenu/QuickAddMenuKindPicker';

const CONVERT_MODE_LABEL_KEYS = {
  existing: 'sprintPlanner.featureLanes.convertModeExisting',
  new: 'sprintPlanner.featureLanes.convertModeNew',
} as const;

interface FeatureLaneDraftRowPickerProps {
  convertItems: readonly QuickAddPickerItem[];
  disabled: boolean;
  removeLabel: string;
  showConvert: boolean;
  showDelete: boolean;
  showMove: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSelectConvert: (mode: QuickAddMode) => void;
  onSelectMove: () => void;
}

export function FeatureLaneDraftRowPicker({
  convertItems,
  disabled,
  onClose,
  onDelete,
  onSelectConvert,
  onSelectMove,
  removeLabel,
  showConvert,
  showDelete,
  showMove,
}: FeatureLaneDraftRowPickerProps) {
  const { t } = useI18n();
  const moreLabel = t('sprintPlanner.featureLanes.rowMoreActions');
  const showHeader = !showConvert;
  return (
    <div>
      {showConvert ? (
        <QuickAddMenuKindPicker
          disabled={disabled}
          items={convertItems}
          modeLabelKeys={CONVERT_MODE_LABEL_KEYS}
          title={t('sprintPlanner.featureLanes.convertTitle')}
          onClose={onClose}
          onSelect={onSelectConvert}
        />
      ) : (
        <div className="flex items-center gap-1 px-3 pt-2.5">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {moreLabel}
          </h2>
          <QuickAddMenuCloseButton onClose={onClose} />
        </div>
      )}
      {showMove ? (
        <div className={showConvert ? '' : 'pt-1'}>
          {showConvert ? <div className={CONTEXT_MENU_SEPARATOR} role="separator" /> : null}
          <Button
            className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
            disabled={disabled}
            role="menuitem"
            type="button"
            variant="ghost"
            onClick={onSelectMove}
          >
            <span className="inline-flex min-w-0 flex-1 items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                <Icon className="h-4 w-4" name="calendar" />
              </span>
              <span>{t('sprintPlanner.contextMenu.moveToSprint')}</span>
            </span>
          </Button>
        </div>
      ) : null}
      {showDelete ? (
        <>
          {showConvert || showMove ? <div className={CONTEXT_MENU_SEPARATOR} role="separator" /> : null}
          <div className={showConvert || showMove || !showHeader ? '' : 'py-1'}>
            <Button
              className={`${CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
              disabled={disabled}
              role="menuitem"
              type="button"
              variant="ghost"
              onClick={onDelete}
            >
              <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                  <Icon className="h-4 w-4" name="trash" />
                </span>
                <span>{removeLabel}</span>
              </span>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
