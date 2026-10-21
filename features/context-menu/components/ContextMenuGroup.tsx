import type { ReactNode } from 'react';

import { Children } from 'react';

import { MENU_ROW_STACK } from '@/features/context-menu/contextMenuClasses';

interface ContextMenuGroupProps {
  'aria-label'?: string;
  children: ReactNode;
  /** По умолчанию — столбец строк `MENU_ROW_STACK`. */
  className?: string;
}

/**
 * Группа пунктов меню задачи. Линию между группами рисует `.menu-groups` в `globals.css`;
 * без отрисованных пунктов группы нет, поэтому и лишней линии нет.
 */
export function ContextMenuGroup({ 'aria-label': ariaLabel, children, className }: ContextMenuGroupProps) {
  if (Children.toArray(children).length === 0) {
    return null;
  }
  return (
    <div aria-label={ariaLabel} className={className ?? MENU_ROW_STACK} data-menu-group="" role="group">
      {children}
    </div>
  );
}
