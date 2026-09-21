import type { QuarterlyPlanPhaseKind, QuarterlyStoryEventKind } from '../types';

/** Заливка недельной ячейки — приглушённый «план» (фон), не конкурирует с фактом. */
export function quarterlyPhaseWeekFillClass(kind: QuarterlyPlanPhaseKind): string {
  if (kind === 'discovery') {
    return 'bg-amber-500/10 dark:bg-amber-400/12 ring-1 ring-inset ring-amber-500/20 dark:ring-amber-400/25';
  }
  return 'bg-blue-500/10 dark:bg-blue-400/12 ring-1 ring-inset ring-blue-400/20 dark:ring-blue-400/25';
}

/** Заливка ячейки по событию-факту (насыщеннее плана). */
export function quarterlyStoryEventWeekFillClass(kind: QuarterlyStoryEventKind): string {
  switch (kind) {
    case 'task_released':
      return 'bg-emerald-400/70 dark:bg-emerald-600/55';
    case 'not_taken_on_time':
      return 'bg-red-400/70 dark:bg-red-600/55';
    case 'slipped_new_expected':
      return 'bg-orange-400/70 dark:bg-orange-600/55';
    case 'release_expected_this_week':
      return 'bg-slate-300/75 dark:bg-slate-500/50';
    case 'delivery_as_planned':
      return 'bg-blue-400/65 dark:bg-blue-500/50';
    case 'discovery_as_planned':
      return 'bg-amber-400/65 dark:bg-amber-500/50';
    default:
      return 'bg-gray-300/70 dark:bg-gray-600/50';
  }
}
