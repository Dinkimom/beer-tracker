'use client';

import type { ReactNode } from 'react';

import { useEffect, useRef } from 'react';

import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import {
  FLOATING_MENU_GLASS_SHELL,
  MENU_PANEL_PADDING,
  MENU_ROW_ICON,
  MENU_ROW_STACK,
} from '@/features/context-menu/contextMenuClasses';
import { calculateSubmenuPosition } from '@/features/context-menu/utils/submenuPositioning';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { DELAYS } from '@/utils/constants';

interface ContextSubmenuProps {
  /** Классы прокручиваемого списка (высота). */
  bodyClassName: string;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  children: ReactNode;
  disabled: boolean;
  /** Имя иконки строки-триггера. */
  icon: string;
  isOpen: boolean;
  label: string;
  /** Смена значения — панель перепозиционируется (подгрузился список, поменялась высота). */
  layoutKey?: number | string;
  menuRef: React.RefObject<HTMLDivElement | null>;
  /** Классы панели (ширина). */
  panelClassName: string;
  /** Значение справа в строке-триггере. */
  value?: string;
  /** Панель размонтирована после exit-анимации: можно сбросить данные без мелькания. Стабильная ссылка. */
  onExited?: () => void;
  onToggle: () => void;
}

/** Подменю контекстного меню: строка-триггер и стеклянная панель сбоку от основного меню. */
export function ContextSubmenu({
  bodyClassName,
  buttonRef,
  children,
  disabled,
  icon,
  isOpen,
  label,
  layoutKey,
  menuRef,
  panelClassName,
  value,
  onExited,
  onToggle,
}: ContextSubmenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlay = useOverlayPresence(isOpen);

  useEffect(() => {
    if (!overlay.mounted) onExited?.();
  }, [overlay.mounted, onExited]);

  useEffect(() => {
    if (isOpen && panelRef.current && buttonRef.current && menuRef.current) {
      const menuElement = menuRef.current;

      const updatePosition = () => {
        if (!panelRef.current || !buttonRef.current || !menuElement) return;

        const menuRect = menuElement.getBoundingClientRect();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        // offset*: getBoundingClientRect меньше на время enter-анимации (scale 0.96)
        const subMenuRect = DOMRect.fromRect({
          height: panelRef.current.offsetHeight,
          width: panelRef.current.offsetWidth,
        });
        const panelParent = panelRef.current.parentElement;
        if (!panelParent) return;
        const parentRect = panelParent.getBoundingClientRect();

        const { left, top } = calculateSubmenuPosition(menuRect, buttonRect, subMenuRect, parentRect);

        panelRef.current.style.left = `${left}px`;
        panelRef.current.style.top = `${top}px`;
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition();
          setTimeout(updatePosition, DELAYS.POSITIONING);
        });
      });
    }
  }, [isOpen, layoutKey, menuRef, buttonRef]);

  return (
    <div className="relative">
      <ContextMenuRow
        ref={buttonRef}
        disabled={disabled}
        icon={<Icon aria-hidden className={MENU_ROW_ICON} name={icon} />}
        label={label}
        submenuOpen={isOpen}
        value={value}
        onClick={onToggle}
      />
      {overlay.mounted ? (
        <div
          ref={panelRef}
          className={`absolute w-max ${panelClassName} ${FLOATING_MENU_GLASS_SHELL} ${ZIndex.class('submenu')} ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          data-submenu="true"
          onAnimationEnd={overlay.onAnimationEnd}
        >
          <div className={`overflow-y-auto ${bodyClassName} ${MENU_PANEL_PADDING} ${MENU_ROW_STACK}`}>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
