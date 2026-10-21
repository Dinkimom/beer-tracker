'use client';

import type { QuickAddMode, QuickAddPickerItem } from './types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { useI18n } from '@/contexts/LanguageContext';
import { useObjectStorageConfigured } from '@/contexts/ObjectStorageConfiguredContext';
import { ExcalidrawMark } from '@/features/comments/components/ExcalidrawMark';
import { StickyNoteToolIcon } from '@/features/comments/components/StickyNoteToolIcon';
import { MENU_ROW, MENU_SEPARATOR } from '@/features/context-menu/contextMenuClasses';

import {
  quickAddModeIconName,
  quickAddModeMessageKey,
  quickAddModeRequiresObjectStorage,
} from './quickAddMenuModes';

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
    return <Icon className="h-5 w-5" name="issue-task" />;
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
  const objectStorageConfigured = useObjectStorageConfigured();
  if (item.kind === 'separator') {
    return <div className={MENU_SEPARATOR} role="separator" />;
  }
  const id = item.mode;
  const needsObjectStorage = quickAddModeRequiresObjectStorage(id);
  const storageDisabled = needsObjectStorage && !objectStorageConfigured;
  const rowDisabled = disabled || storageDisabled;
  const storageHint = t('sprintPlanner.swimlane.placementToolbar.objectStorageRequired');
  return (
    <Button
      className={MENU_ROW}
      data-quick-add-mode={id}
      disabled={rowDisabled}
      role="menuitem"
      title={storageDisabled ? storageHint : undefined}
      type="button"
      variant="ghost"
      onClick={() => onSelect(id)}
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400">
        {resolveQuickAddPickerGlyph(id)}
      </span>
      <span className="min-w-0 flex-1 truncate">{t(labelKey ?? quickAddModeMessageKey(id))}</span>
    </Button>
  );
}
