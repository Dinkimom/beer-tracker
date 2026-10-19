'use client';

import type { CSSProperties, HTMLAttributes, MouseEvent, ReactNode } from 'react';

import { ZIndex } from '@/constants';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
} from '@/features/context-menu/contextMenuClasses';

/** Иконка-кнопка внутри капсулы под карточкой (агент, подтверждение отрезков и т.п.). */
const CARD_FLOATING_TOOLBAR_ICON_BUTTON = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !w-6 !min-h-0 !min-w-0 !justify-center !rounded-md !p-0`;

export const CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS = `${CARD_FLOATING_TOOLBAR_ICON_BUTTON} text-green-700/90 hover:!bg-green-500/[0.12] dark:text-green-400/90 dark:hover:!bg-green-400/[0.12]`;

export const CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS = `${CARD_FLOATING_TOOLBAR_ICON_BUTTON} text-red-600/90 hover:!bg-red-500/[0.1] dark:text-red-400/90 dark:hover:!bg-red-400/[0.1]`;

const BELOW_END_PLACEMENT =
  'pointer-events-auto absolute right-0 top-full mt-1 w-max max-w-none whitespace-nowrap';

function preventCardGesture(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

interface CardFloatingToolbarOwnProps {
  children: ReactNode;
  className?: string;
  /** Под правым краем якоря, `mt-1` — как у агентского тулбара на карточке. */
  placement?: 'below-end' | 'none';
  style?: CSSProperties;
  onMouseDown?: (event: MouseEvent) => void;
}

type CardFloatingToolbarProps = CardFloatingToolbarOwnProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'onMouseDown' | 'style'>;

/**
 * Стеклянная капсула действий под карточкой планера
 * (approve/reject агента, сохранить/отменить отрезки и аналогичные).
 */
export function CardFloatingToolbar({
  children,
  className = '',
  placement = 'below-end',
  style,
  onMouseDown,
  ...rest
}: CardFloatingToolbarProps) {
  const placementClass =
    placement === 'below-end' ? BELOW_END_PLACEMENT : 'pointer-events-auto w-max max-w-none whitespace-nowrap';
  return (
    <div
      {...rest}
      className={`${placementClass} flex items-center gap-0.5 p-0.5 ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS} ${className}`}
      data-card-floating-toolbar=""
      style={{ zIndex: ZIndex.stickyElevated, ...style }}
      onMouseDown={(event) => {
        preventCardGesture(event);
        onMouseDown?.(event);
      }}
    >
      {children}
    </div>
  );
}

export function handleCardFloatingToolbarActionClick(
  event: MouseEvent,
  run?: () => void
): void {
  event.preventDefault();
  event.stopPropagation();
  run?.();
}
