'use client';

import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';

import { Button } from '@/components/Button';
import { ZIndex } from '@/constants';
import { PlannerAvailabilityLabelBackground } from '@/features/sprint/components/SprintPlanner/layout/PlannerAvailabilityLabelBackground';
import { PLANNER_HATCH_BASE_CLASS } from '@/features/sprint/components/SprintPlanner/layout/plannerHatchTones';

interface SwimlaneAvailabilityChipProps {
  kind: AvailabilityCardKind;
  label: string;
  leftPercent: number;
  maxWidthPercent: number;
  topPx: number;
  onClick: () => void;
}

const CHIP_TONE_CLASS: Record<AvailabilityCardKind, string> = {
  duty: 'border-violet-400/80 text-violet-900 dark:border-violet-500/70 dark:text-violet-100',
  sick_leave: 'border-rose-400/80 text-rose-900 dark:border-rose-500/70 dark:text-rose-100',
  'tech-sprint-back':
    'border-emerald-400/80 text-emerald-900 dark:border-emerald-500/70 dark:text-emerald-100',
  'tech-sprint-qa':
    'border-orange-400/80 text-orange-900 dark:border-orange-500/70 dark:text-orange-100',
  'tech-sprint-web': 'border-sky-400/80 text-sky-900 dark:border-sky-500/70 dark:text-sky-100',
  vacation: 'border-amber-400/80 text-amber-900 dark:border-amber-500/70 dark:text-amber-100',
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
      className={`absolute h-5 min-h-0 min-w-0 max-w-full cursor-pointer overflow-hidden rounded-md border !px-0 !py-0 text-left text-[11px] font-medium leading-5 shadow-none hover:!bg-white dark:hover:!bg-gray-800 ${PLANNER_HATCH_BASE_CLASS} ${CHIP_TONE_CLASS[kind]}`}
      style={{
        left: `calc(${leftPercent}% + 4px)`,
        maxWidth: `calc(${maxWidthPercent}% - 8px)`,
        top: topPx,
        zIndex: ZIndex.contentInteractive,
      }}
      title={label}
      type="button"
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <PlannerAvailabilityLabelBackground tone={kind} />
      <span className="relative z-10 block truncate px-1.5">{label}</span>
    </Button>
  );
}
