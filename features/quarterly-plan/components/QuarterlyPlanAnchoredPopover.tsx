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
  onDismiss,
}: QuarterlyPlanAnchoredPopoverProps) {
  const virtualRef = useMemo(
    () => ({
      current: { getBoundingClientRect: () => DOMRect.fromRect({ height: 0, width: 0, x: anchor.x, y: anchor.y }) },
    }),
    [anchor.x, anchor.y]
  );

  return (
    <Popover.Root open>
      <Popover.Anchor virtualRef={virtualRef} />
      {/* Прозрачная подложка: клик мимо только закрывает поповер и не попадает в кнопки доски под ним.
          Свой портал — Popover.Portal принимает ровно один дочерний элемент. */}
      {createPortal(
        <div aria-hidden className="fixed inset-0" style={{ zIndex: ZIndex.modalBackdrop }} />,
        document.body
      )}
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
