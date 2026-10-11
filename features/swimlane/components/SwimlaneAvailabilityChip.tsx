'use client';

import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';

import { Button } from '@/components/Button';
import { ZIndex } from '@/constants';

interface SwimlaneAvailabilityChipProps {
  kind: AvailabilityCardKind;
  label: string;
  leftPercent: number;
  maxWidthPercent: number;
  topPx: number;
  onClick: () => void;
}

/** Цвет текста по kind — без пилюли; hover только через opacity/underline. */
const CHIP_TEXT_CLASS: Record<AvailabilityCardKind, string> = {
  duty: 'text-violet-900 dark:text-violet-50',
  sick_leave: 'text-rose-900 dark:text-rose-50',
  'tech-sprint-back': 'text-emerald-900 dark:text-emerald-50',
  'tech-sprint-qa': 'text-orange-900 dark:text-orange-50',
  'tech-sprint-web': 'text-sky-900 dark:text-sky-50',
  vacation: 'text-amber-950 dark:text-amber-50',
};

export function SwimlaneAvailabilityChip({
  kind,
  label,
  leftPercent,
  maxWidthPercent,
  topPx,
  onClick,
}: SwimlaneAvailabilityChipProps) {
  return (
    <Button
      aria-label={label}
      className={`absolute h-5 min-h-0 min-w-0 max-w-full cursor-pointer overflow-hidden rounded-none border-0 !bg-transparent !px-0 !py-0 text-left text-[11px] font-semibold leading-5 shadow-none transition-opacity duration-200 hover:!bg-transparent hover:opacity-80 hover:underline active:!bg-transparent active:scale-[0.98] active:opacity-70 dark:hover:!bg-transparent dark:active:!bg-transparent ${CHIP_TEXT_CLASS[kind]}`}
      style={{
        left: `calc(${leftPercent}% + 4px)`,
        maxWidth: `calc(${maxWidthPercent}% - 8px)`,
        top: topPx,
        zIndex: ZIndex.contentInteractive,
      }}
      type="button"
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span className="relative block truncate px-1.5 [text-shadow:0_0_6px_rgb(255_255_255_/_0.7),0_1px_1px_rgb(0_0_0_/_0.1)] dark:[text-shadow:none]">
        {label}
      </span>
    </Button>
  );
}
