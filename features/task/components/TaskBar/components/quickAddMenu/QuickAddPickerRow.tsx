'use client';

import type { QuickAddMode, QuickAddPickerItem } from './types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { useI18n } from '@/contexts/LanguageContext';
import { ExcalidrawMark } from '@/features/comments/components/ExcalidrawMark';
import { StickyNoteToolIcon } from '@/features/comments/components/StickyNoteToolIcon';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_SEPARATOR,
} from '@/features/context-menu/contextMenuClasses';

import { quickAddModeIconName, quickAddModeMessageKey } from './quickAddMenuModes';

function resolveQuickAddPickerGlyph(id: QuickAddMode) {
  if (id === 'comment') {
    return <StickyNoteToolIcon className="h-4 w-4" variant="outline" />;
  }
  if (id === 'diagram') {
    return <ExcalidrawMark className="h-5 w-5" tone="inherit" />;
  }
  if (id === 'draft') {
    return <IssueTypeIcon className="h-4 w-4" type="draft" />;
  }
  if (id === 'new') {
    return <Icon className="h-6 w-6" name="issue-task" />;
  }
  return <Icon className="h-4 w-4" name={quickAddModeIconName(id)} />;
}

interface QuickAddPickerRowProps {
  disabled: boolean;
  item: QuickAddPickerItem;
  labelKey?: string;
  onSelect: (id: QuickAddMode) => void;
}

export function QuickAddPickerRow({
  disabled,
  item,
  labelKey,
  onSelect,
}: QuickAddPickerRowProps) {
  const { t } = useI18n();
  if (item.kind === 'separator') {
    return <div className={CONTEXT_MENU_SEPARATOR} role="separator" />;
  }
  const id = item.mode;
  return (
    <Button
      className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
      data-quick-add-mode={id}
      disabled={disabled}
      role="menuitem"
      type="button"
      variant="ghost"
      onClick={() => onSelect(id)}
    >
      <span className="inline-flex min-w-0 flex-1 items-center gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400">
          {resolveQuickAddPickerGlyph(id)}
        </span>
        <span>{t(labelKey ?? quickAddModeMessageKey(id))}</span>
      </span>
    </Button>
  );
}
