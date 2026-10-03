import type { RetroColumn, RetroColumnPreset } from '@/lib/retro/retroBoard';

import { retroColumnLabel } from '@/lib/retro/retroBoard';

export const retroIconButtonClass =
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-300 dark:hover:bg-white/10';

export const retroListClass =
  'flex max-h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

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
