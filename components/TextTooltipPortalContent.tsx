'use client';

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
  open: boolean;
  side: string;
  sideOffset: number;
}

export function TextTooltipPortalContent({
  align,
  content,
  contentClassName,
  cursorPos,
  followCursor,
  interactive,
  open,
  side,
  sideOffset,
}: TextTooltipPortalContentProps) {
  if (followCursor) {
    if (!open) return null;
    return (
      <div
        className={`${ZIndex.class('tooltip')} ${tooltipContentClass} ${OVERLAY_TOOLTIP_ANIMATION} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'} ${contentClassName}`}
        style={{
          position: 'fixed',
          left: cursorPos.x + 12,
          top: cursorPos.y + 12,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <Tooltip.Content
      align={align}
      className={`${ZIndex.class('tooltip')} ${tooltipContentClass} ${OVERLAY_TOOLTIP_ANIMATION} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'} ${contentClassName}`}
      collisionPadding={8}
      side={side as 'bottom' | 'left' | 'right' | 'top'}
      sideOffset={sideOffset}
    >
      {content}
    </Tooltip.Content>
  );
}
