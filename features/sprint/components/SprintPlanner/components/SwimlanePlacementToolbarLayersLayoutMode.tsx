'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
} from '@/features/context-menu/contextMenuClasses';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import {
  SWIMLANE_BASELINE_LAYOUT_MODES,
  type SwimlaneBaselineLayoutMode,
} from '@/lib/swimlane/swimlaneBaselineLayoutMode';

import {
  placementToolbarLayoutModeMessageKey,
  resolveLayoutModeSubmenuViewportPosition,
} from '../utils/swimlanePlacementToolbar';

const LAYOUT_MENU_ITEM_CLASS =
  `!h-9 !min-h-0 w-full !justify-start !gap-2 !rounded-none !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} text-gray-700 hover:!bg-gray-50 dark:text-gray-200 dark:hover:!bg-gray-700`;

const LAYOUT_OPTION_CLASS =
  `!flex !h-9 !min-h-0 !w-auto !min-w-0 !justify-between !gap-2 !rounded-none !px-2.5 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} text-gray-700 hover:!bg-gray-50 dark:text-gray-200 dark:hover:!bg-gray-700`;

interface SwimlanePlacementToolbarLayersLayoutModeProps {
  mode: SwimlaneBaselineLayoutMode;
  onChange: (mode: SwimlaneBaselineLayoutMode) => void;
}

export function SwimlanePlacementToolbarLayersLayoutMode({
  mode,
  onChange,
}: SwimlanePlacementToolbarLayersLayoutModeProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const overlay = useOverlayPresence(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || submenuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      // Safari: without preventDefault, Escape exits fullscreen.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const submenu = submenuRef.current;
    const menu = button?.closest('[role="menu"]');
    if (!overlay.mounted || !button || !submenu || !(menu instanceof HTMLElement)) {
      return;
    }
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const submenuRect = submenu.getBoundingClientRect();
    const next = resolveLayoutModeSubmenuViewportPosition({
      buttonTop: buttonRect.top,
      menuLeft: menuRect.left,
      menuRight: menuRect.right,
      submenuHeight: submenuRect.height,
      submenuWidth: submenuRect.width,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    });
    submenu.style.left = `${next.left}px`;
    submenu.style.top = `${next.top}px`;
    submenu.style.visibility = 'visible';
  }, [overlay.mounted, open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={buttonRef}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${LAYOUT_MENU_ITEM_CLASS} !justify-between ${
          open ? '!bg-gray-50 dark:!bg-gray-700' : ''
        }`}
        role="menuitem"
        type="button"
        variant="ghost"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {t('sprintPlanner.swimlane.placementToolbar.layoutMode')}
        </span>
        <span className="max-w-[7.5rem] truncate text-gray-400 dark:text-gray-500">
          {t(
            `sprintPlanner.swimlane.placementToolbar.${placementToolbarLayoutModeMessageKey(mode)}`
          )}
        </span>
        <Icon
          aria-hidden
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-90' : ''
          }`}
          name="chevron-right"
        />
      </Button>
      {overlay.mounted
        ? createPortal(
            <div
              ref={submenuRef}
              aria-label={t('sprintPlanner.swimlane.placementToolbar.layoutMode')}
              className={`fixed grid w-max justify-items-stretch py-1 ${FLOATING_MENU_SHELL} ${ZIndex.class('submenu')} ${OVERLAY_PANEL_ENTER}`}
              data-state={overlay.state}
              data-submenu="true"
              role="menu"
              style={{ visibility: 'hidden' }}
              onAnimationEnd={overlay.onAnimationEnd}
            >
              {SWIMLANE_BASELINE_LAYOUT_MODES.map((item) => {
                const selected = mode === item;
                return (
                  <Button
                    key={item}
                    aria-checked={selected}
                    className={LAYOUT_OPTION_CLASS}
                    role="menuitemradio"
                    type="button"
                    variant="ghost"
                    onClick={() => onChange(item)}
                  >
                    <span className="whitespace-nowrap text-left">
                      {t(
                        `sprintPlanner.swimlane.placementToolbar.${placementToolbarLayoutModeMessageKey(item)}`
                      )}
                    </span>
                    {selected ? (
                      <Icon className="h-4 w-4 shrink-0" name="check" />
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                  </Button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
