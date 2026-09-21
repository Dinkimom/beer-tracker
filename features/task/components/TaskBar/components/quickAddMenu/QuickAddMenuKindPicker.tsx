'use client';

import type { QuickAddMode, QuickAddPickerItem } from './types';

import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

import { QuickAddMenuCloseButton } from './QuickAddMenuCloseButton';
import {
  resolveFocusedQuickAddMode,
  resolveQuickAddModeFromTabKey,
} from './quickAddMenuKeyboard';
import { quickAddPickerSelectableIds } from './quickAddMenuModes';
import { QuickAddPickerRow } from './QuickAddPickerRow';

interface QuickAddMenuKindPickerProps {
  disabled?: boolean;
  items: readonly QuickAddPickerItem[];
  modeLabelKeys?: Partial<Record<QuickAddMode, string>>;
  title?: string;
  onClose: () => void;
  onSelect: (id: QuickAddMode) => void;
}

export function QuickAddMenuKindPicker({
  disabled = false,
  items,
  modeLabelKeys,
  onClose,
  onSelect,
  title,
}: QuickAddMenuKindPickerProps) {
  const { t } = useI18n();
  const heading = title ?? t('sprintPlanner.swimlane.quickAddMenu.modeTablist');
  const menuRef = useRef<HTMLDivElement>(null);
  const selectableIds = quickAddPickerSelectableIds(items);

  useLayoutEffect(() => {
    const first = menuRef.current?.querySelector<HTMLElement>('[data-quick-add-mode]');
    first?.focus();
  }, []);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    const current = resolveFocusedQuickAddMode(document.activeElement, selectableIds);
    if (!current) {
      return;
    }
    const nextId = resolveQuickAddModeFromTabKey(event.key, selectableIds, current);
    if (!nextId) {
      return;
    }
    event.preventDefault();
    const tab = menuRef.current?.querySelector<HTMLElement>(
      `[data-quick-add-mode="${nextId}"]`
    );
    tab?.focus();
  };

  return (
    <div>
      <div className="flex items-center gap-1 px-3 pt-2.5">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {heading}
        </h2>
        <QuickAddMenuCloseButton disabled={disabled} onClose={onClose} />
      </div>
      <div
        ref={menuRef}
        aria-label={heading}
        className="pt-1"
        role="menu"
        onKeyDown={handleMenuKeyDown}
      >
        {items.map((item, index) => (
          <QuickAddPickerRow
            key={item.kind === 'separator' ? `separator-${index}` : item.mode}
            disabled={disabled}
            item={item}
            labelKey={item.kind === 'mode' ? modeLabelKeys?.[item.mode] : undefined}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
