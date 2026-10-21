'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { forwardRef } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import {
  MENU_ROW,
  MENU_ROW_DESTRUCTIVE,
  MENU_ROW_OPEN,
  MENU_ROW_VALUE,
} from '@/features/context-menu/contextMenuClasses';

interface ContextMenuRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'value'> {
  className?: string;
  destructive?: boolean;
  /** Иконка слева; класс цвета задаёт вызывающий (`MENU_ROW_ICON`). */
  icon: ReactNode;
  label: ReactNode;
  /** Пункт открывает подменю сбоку: шеврон справа, фон «открыто». */
  submenuOpen?: boolean;
  /** Текущее значение справа (статус, оценка, исполнитель). */
  value?: ReactNode;
}

/**
 * Пункт меню задачи. `forwardRef` и проброс пропсов — для `Popover.Trigger asChild`
 * и для `buttonRef`, от которого позиционируются подменю.
 */
export const ContextMenuRow = forwardRef<HTMLButtonElement, ContextMenuRowProps>(
  function ContextMenuRow(
    { className = '', destructive = false, icon, label, submenuOpen, value, ...props },
    ref
  ) {
    const hasSubmenu = submenuOpen !== undefined;
    return (
      <Button
        ref={ref}
        aria-expanded={hasSubmenu ? submenuOpen : undefined}
        aria-haspopup={hasSubmenu ? 'menu' : undefined}
        className={`${destructive ? MENU_ROW_DESTRUCTIVE : MENU_ROW} ${submenuOpen ? MENU_ROW_OPEN : ''} ${className}`}
        type="button"
        variant="ghost"
        {...props}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {value ? <span className={MENU_ROW_VALUE}>{value}</span> : null}
        {hasSubmenu ? (
          <Icon aria-hidden className="-mr-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" name="chevron-right" />
        ) : null}
      </Button>
    );
  }
);
