import type { RetroColumn, RetroColumnPreset } from '@/lib/retro/retroBoard';

import { retroColumnLabel } from '@/lib/retro/retroBoard';

export const retroIconButtonClass =
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 disabled:pointer-events-none disabled:opacity-30 dark:text-gray-300 dark:hover:bg-white/10 dark:active:bg-white/15';

export const retroFactsSectionTitleClass =
  'text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500';

export const retroFactsCaptionClass = 'text-[11px] leading-4 text-gray-400 dark:text-gray-500';

export const retroFactsTableClass =
  'divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-700 dark:border-gray-700';

export const retroFactsPairGridClass =
  'grid grid-cols-[minmax(0,1fr)_4.75rem_3.25rem] items-baseline gap-2';

export const retroListClass =
  'flex max-h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export function retroCardDragId(ownerSprintId: number, cardId: string): string {
  return `retro-card:${ownerSprintId}:${cardId}`;
}

export function retroColumnDragId(columnId: string): string {
  return `retro-column:${columnId}`;
}

export function retroColumnTitle(column: RetroColumn, t: (key: string) => string): string {
  return retroColumnLabel(
    column,
    (preset: RetroColumnPreset) => t(`retro.presets.${preset}`),
    t('retro.untitledColumn')
  );
}
