'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { ReactNode } from 'react';

import * as Popover from '@radix-ui/react-popover';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';

import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { FLOATING_MENU_GLASS_SHELL } from '@/features/context-menu/contextMenuClasses';

interface QuarterlyPlanAnchoredPopoverProps {
  anchor: QuarterMenuAnchor;
  children: ReactNode;
  className: string;
  /** false — поповер уходит с анимацией; родитель держит его на экране, пока она идёт (`useClosingValue`). */
  open?: boolean;
  /** Поповер закрывают: Escape или клик мимо. */
  onDismiss: (reason: 'escape' | 'outside') => void;
}

/**
 * Стеклянный поповер у точки клика: общая оболочка меню доски и редактора заметки.
 * Пока он открыт, доска под ним не кликается: первый клик мимо закрывает поповер.
 */
export function QuarterlyPlanAnchoredPopover({
  anchor,
  children,
  className,
  open = true,
  onDismiss,
}: QuarterlyPlanAnchoredPopoverProps) {
  const virtualRef = useMemo(
    () => ({
      current: { getBoundingClientRect: () => DOMRect.fromRect({ height: 0, width: 0, x: anchor.x, y: anchor.y }) },
    }),
    [anchor.x, anchor.y]
  );

  return (
    <Popover.Root open={open}>
      <Popover.Anchor virtualRef={virtualRef} />
      {/* Прозрачная подложка: клик мимо только закрывает поповер и не попадает в кнопки доски под ним.
          Свой портал — Popover.Portal принимает ровно один дочерний элемент. */}
      {open
        ? createPortal(<div aria-hidden className="fixed inset-0" style={{ zIndex: ZIndex.modalBackdrop }} />, document.body)
        : null}
      <Popover.Portal>
        <Popover.Content
          align="start"
          className={`outline-none ${FLOATING_MENU_GLASS_SHELL} ${OVERLAY_FLOATING_ANIMATION} ${className}`}
          collisionPadding={8}
          side="bottom"
          sideOffset={6}
          style={{ zIndex: ZIndex.modal }}
          onEscapeKeyDown={() => onDismiss('escape')}
          onInteractOutside={() => onDismiss('outside')}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
