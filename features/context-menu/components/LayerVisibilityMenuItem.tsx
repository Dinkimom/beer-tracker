'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

import { CONTEXT_MENU_GHOST_BUTTON_RESET } from '../contextMenuClasses';

interface LayerVisibilityMenuItemProps {
  /** Значок слоя слева. */
  glyph: ReactNode;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

/**
 * Строка меню «Слои»: значок, название и глаз — виден ли слой. Скрытый слой — приглушённая строка.
 * Общая для доски спринта и квартального плана.
 */
export function LayerVisibilityMenuItem({ glyph, label, visible, onToggle }: LayerVisibilityMenuItemProps) {
  return (
    <Button
      aria-checked={visible}
      className={`!h-9 !min-h-0 w-full !justify-start !gap-2 !rounded-none !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${
        visible
          ? 'text-gray-700 hover:!bg-gray-50 dark:text-gray-200 dark:hover:!bg-gray-700'
          : 'text-gray-400 hover:!bg-gray-50 dark:text-gray-500 dark:hover:!bg-gray-700'
      }`}
      role="menuitemcheckbox"
      type="button"
      variant="ghost"
      onClick={onToggle}
    >
      {glyph}
      <span className="flex-1 text-left">{label}</span>
      <Icon className="h-4 w-4 shrink-0" name={visible ? 'eye' : 'eye-off'} />
    </Button>
  );
}
