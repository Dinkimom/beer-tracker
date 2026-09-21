'use client';

import type { QuarterlyPlannerCellMenuAnchor } from '../../../utils/quarterlyPlannerCellMenuAnchor';
import type { ReactNode } from 'react';

import * as Popover from '@radix-ui/react-popover';
import { useLayoutEffect, useRef } from 'react';

import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';

const POPOVER_CONTENT_CLASS =
  `z-[300] rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`;

interface QuarterlyPlannerCellPopoverProps {
  anchor: QuarterlyPlannerCellMenuAnchor;
  children: ReactNode;
  contentClassName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Popover, привязанный к правому нижнему углу ячейки (левый верхний угол контента — в этой точке).
 * Radix сдвигает и переворачивает меню у края viewport.
 */
export function QuarterlyPlannerCellPopover({
  open,
  anchor,
  onOpenChange,
  children,
  contentClassName = '',
}: QuarterlyPlannerCellPopoverProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    el.style.position = 'fixed';
    el.style.left = `${anchor.anchorRight}px`;
    el.style.top = `${anchor.anchorBottom}px`;
    el.style.width = '0';
    el.style.height = '0';
    el.style.pointerEvents = 'none';
  }, [anchor.anchorBottom, anchor.anchorRight]);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor ref={anchorRef} />
      <Popover.Portal>
        <Popover.Content
          align="start"
          avoidCollisions
          className={`${POPOVER_CONTENT_CLASS} ${contentClassName}`.trim()}
          collisionPadding={12}
          side="bottom"
          sideOffset={0}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
