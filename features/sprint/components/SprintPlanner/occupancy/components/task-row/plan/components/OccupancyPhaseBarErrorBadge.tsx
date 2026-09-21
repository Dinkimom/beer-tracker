import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';

interface OccupancyPhaseBarErrorBadgeProps {
  compactRowMode: boolean;
  errorTooltip?: string;
  isInError?: boolean;
  pointerEventsNone?: boolean;
}

export function OccupancyPhaseBarErrorBadge({
  compactRowMode,
  errorTooltip,
  isInError,
  pointerEventsNone,
}: OccupancyPhaseBarErrorBadgeProps): ReactNode {
  if (!isInError) return null;
  return (
    <span className="absolute top-0 right-0 z-10" style={{ transform: 'translate(50%, -50%)' }}>
      <TextTooltip content={errorTooltip || 'Ошибка планирования'}>
        <span
          className={`inline-flex ${compactRowMode ? 'w-4 h-4' : 'w-5 h-5'} items-center justify-center rounded-full bg-red-500 dark:bg-red-400 text-white border-2 border-white dark:border-gray-800 shadow-sm cursor-default transition-transform duration-150 hover:scale-125 ${pointerEventsNone ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
          <Icon
            className={`${compactRowMode ? 'w-2.5 h-2.5' : 'w-3 h-3'} shrink-0`}
            name="exclamation"
          />
        </span>
      </TextTooltip>
    </span>
  );
}
