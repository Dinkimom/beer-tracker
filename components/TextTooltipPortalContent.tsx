'use client';

import type { AnimationEvent } from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

import { OVERLAY_TOOLTIP_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';

const tooltipContentClass =
  'w-max max-w-[90vw] whitespace-normal rounded px-2 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 shadow-lg';

interface TextTooltipPortalContentProps {
  align: 'center' | 'end' | 'start';
  content: React.ReactNode;
  contentClassName: string;
  cursorPos: { x: number; y: number };
  followCursor: boolean;
  interactive: boolean;
  overlayState: 'closed' | 'open';
  side: string;
  sideOffset: number;
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
}

function tooltipSurfaceClass(interactive: boolean, contentClassName: string): string {
  return `${ZIndex.class('tooltip')} ${tooltipContentClass} ${OVERLAY_TOOLTIP_ANIMATION} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'} ${contentClassName}`;
}

export function TextTooltipPortalContent({
  align,
  content,
  contentClassName,
  cursorPos,
  followCursor,
  interactive,
  overlayState,
  side,
  sideOffset,
  onAnimationEnd,
}: TextTooltipPortalContentProps) {
  const surfaceClass = tooltipSurfaceClass(interactive, contentClassName);
  if (followCursor) {
    return (
      <div
        className={surfaceClass}
        data-state={overlayState}
        style={{
          position: 'fixed',
          left: cursorPos.x + 12,
          top: cursorPos.y + 12,
        }}
        onAnimationEnd={onAnimationEnd}
      >
        {content}
      </div>
    );
  }

  return (
    <Tooltip.Content
      align={align}
      className={surfaceClass}
      collisionPadding={8}
      data-state={overlayState}
      forceMount
      side={side as 'bottom' | 'left' | 'right' | 'top'}
      sideOffset={sideOffset}
      onAnimationEnd={onAnimationEnd}
    >
      {content}
    </Tooltip.Content>
  );
}
