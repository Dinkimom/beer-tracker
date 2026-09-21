'use client';

import type { QuickAddMode } from './types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
} from '@/features/context-menu/contextMenuClasses';

import { QuickAddMenuCloseButton } from './QuickAddMenuCloseButton';
import { quickAddModeMessageKey } from './quickAddMenuModes';

interface QuickAddMenuHeaderProps {
  disabled?: boolean;
  mode: QuickAddMode;
  title?: string;
  onBack?: () => void;
  onClose: () => void;
}

export function QuickAddMenuHeader({
  disabled = false,
  mode,
  onBack,
  onClose,
  title,
}: QuickAddMenuHeaderProps) {
  const { t } = useI18n();
  const backLabel = t('sprintPlanner.swimlane.quickAddMenu.backToKindPicker');
  const heading = title ?? t(quickAddModeMessageKey(mode));

  return (
    <div className="flex items-center gap-1 px-3 pt-2.5">
      {onBack ? (
        <Button
          aria-label={backLabel}
          className={`!h-7 !w-7 !min-h-0 !min-w-0 !justify-center !rounded-md !p-0 text-gray-500 dark:text-gray-400 ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
          disabled={disabled}
          title={backLabel}
          type="button"
          variant="ghost"
          onClick={onBack}
        >
          <Icon className="h-4 w-4" name="arrow-left" />
        </Button>
      ) : null}
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
        {heading}
      </h2>
      <QuickAddMenuCloseButton disabled={disabled} onClose={onClose} />
    </div>
  );
}
