'use client';

import type { ReactNode } from 'react';

import * as Popover from '@radix-ui/react-popover';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';

import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { isOverlayChildTarget } from '@/components/overlayChild';
import { ZIndex } from '@/constants';
import { FLOATING_MENU_GLASS_SHELL } from '@/features/context-menu/contextMenuClasses';

/** Точка клика или прямоугольник элемента, у которого открывается поповер. */
type PopoverAnchor = Pick<DOMRect, 'height' | 'width' | 'x' | 'y'> | { x: number; y: number };

interface AnchoredPopoverProps {
  align?: 'center' | 'end' | 'start';
  anchor: PopoverAnchor;
  children: ReactNode;
  /** Размер и внутренняя раскладка панели. */
  className: string;
  /** false — поповер уходит с анимацией; пока она идёт, его держит на экране Radix. */
  open?: boolean;
  /** Отступ от якоря. */
  sideOffset?: number;
  /** Поповер закрывают: Escape или клик мимо. */
  onDismiss: (reason: 'escape' | 'outside') => void;
}

/**
 * Стеклянный поповер у точки или элемента без своего триггера — одна оболочка для меню и панелей поверх доски.
 * Встаёт под якорем и сам уходит вверх или вбок, если не помещается. Пока он открыт, доска под ним
 * не кликается: первый клик мимо только закрывает поповер.
 */
export function AnchoredPopover({
  align = 'start',
  anchor,
  children,
  className,
  open = true,
  sideOffset = 6,
  onDismiss,
}: AnchoredPopoverProps) {
  const height = 'height' in anchor ? anchor.height : 0;
  const width = 'width' in anchor ? anchor.width : 0;
  const { x, y } = anchor;
  const virtualRef = useMemo(
    () => ({ current: { getBoundingClientRect: () => DOMRect.fromRect({ height, width, x, y }) } }),
    [height, width, x, y]
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
          align={align}
          className={`outline-none ${FLOATING_MENU_GLASS_SHELL} ${OVERLAY_FLOATING_ANIMATION} ${className}`}
          collisionPadding={8}
          side="bottom"
          sideOffset={sideOffset}
          style={{ zIndex: ZIndex.modal }}
          onEscapeKeyDown={() => onDismiss('escape')}
          onInteractOutside={(event) => {
            if (isOverlayChildTarget(event.target)) {
              event.preventDefault();
              return;
            }
            onDismiss('outside');
          }}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
