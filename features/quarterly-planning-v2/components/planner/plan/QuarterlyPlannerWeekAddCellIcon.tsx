'use client';

import type { QuarterlyPlannerWeekAddCellVariant } from './QuarterlyPlannerWeekAddCell';

import { Icon } from '@/components/Icon';

const cornerBadgeClass =
  'flex h-5 w-5 items-center justify-center rounded-sm bg-black/[0.06] dark:bg-white/[0.08]';

export function QuarterlyPlannerWeekAddCellIcon({
  variant,
}: {
  variant: QuarterlyPlannerWeekAddCellVariant;
}) {
  if (variant === 'add') {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/add-cell:opacity-100"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100/90 dark:bg-blue-900/45">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" name="plus-bold" />
        </span>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0.5 left-0.5 z-[1] opacity-0 transition-opacity duration-150 group-hover/add-cell:opacity-100"
    >
      <span className={cornerBadgeClass}>
        <Icon className="h-3 w-3 text-gray-500/90 dark:text-gray-400" name="edit" />
      </span>
    </div>
  );
}
