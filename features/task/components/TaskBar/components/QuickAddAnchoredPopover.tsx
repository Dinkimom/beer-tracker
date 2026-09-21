'use client';

import type { ReactNode } from 'react';

import * as Popover from '@radix-ui/react-popover';
import { useLayoutEffect, useRef } from 'react';

import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import { isPlannerImageCropperOpen } from '@/features/task/utils/cropPlannerImage';
import {
  QUICK_ADD_MENU_MIN_WIDTH_PX,
  resolveQuickAddPopoverCollision,
} from '@/hooks/useFollowAnchorRect';

interface QuickAddAnchoredPopoverProps {
  allowAutoFocus?: boolean;
  anchorRect: DOMRect;
  children: ReactNode;
  minWidth?: number;
  onEscape?: () => void;
}

/**
 * Popover меню quick-add, привязанный к драфтовой карточке.
 * Якорь совпадает с карточкой: меню открывается снизу и переезжает вверх, только если снизу не хватает места.
 */
export function QuickAddAnchoredPopover({
  allowAutoFocus = false,
  anchorRect,
  children,
  minWidth = QUICK_ADD_MENU_MIN_WIDTH_PX,
  onEscape,
}: QuickAddAnchoredPopoverProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const collision = resolveQuickAddPopoverCollision(anchorRect, window.innerHeight);
  const panelWidth = Math.min(minWidth, Math.max(240, window.innerWidth - 16));

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) {
      return;
    }
    el.style.position = 'fixed';
    el.style.left = `${anchorRect.left}px`;
    el.style.top = `${anchorRect.top}px`;
    el.style.width = `${Math.max(anchorRect.width, 1)}px`;
    el.style.height = `${Math.max(anchorRect.height, 1)}px`;
    el.style.pointerEvents = 'none';
  }, [anchorRect]);

  return (
    <Popover.Root modal={false} open>
      <Popover.Anchor ref={anchorRef} />
      <Popover.Portal>
        <Popover.Content
          align="start"
          avoidCollisions
          className={`${FLOATING_MENU_SHELL} overflow-hidden font-sans outline-none ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={8}
          side={collision.side}
          sideOffset={6}
          style={{
            maxHeight: collision.maxHeight,
            minWidth: panelWidth,
            overflowY: 'auto',
            width: panelWidth,
            zIndex: ZIndex.popupContent,
          }}
          onEscapeKeyDown={(event) => {
            if (isPlannerImageCropperOpen()) {
              event.preventDefault();
              return;
            }
            if (!onEscape) {
              return;
            }
            event.preventDefault();
            onEscape();
          }}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            if (!allowAutoFocus) {
              event.preventDefault();
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
