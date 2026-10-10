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

/** Колонка ретро: тот же glass-жёлоб, что у канбана. */
export const retroListClass =
  'kanban-column-glass flex max-h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 text-gray-800 dark:border-white/10 dark:text-gray-100';

export const retroListDropClass =
  'kanban-column-glass flex max-h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-blue-400/70 !bg-blue-500/[0.1] text-gray-800 dark:border-blue-400/50 dark:!bg-blue-500/15 dark:text-gray-100';

/** Карточка на сером/glass-жёлобе — как канбан. */
export const retroCardSurfaceClass =
  'group relative mx-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-900 dark:border-white/15 dark:bg-white/[0.08] dark:text-gray-100';

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
