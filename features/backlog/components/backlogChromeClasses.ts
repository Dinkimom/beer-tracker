/** Glass-хром секций бэклога — в духе канбана и планера. */

export const BACKLOG_SECTION_IDLE =
  'surface-glass-well overflow-hidden rounded-2xl border border-black/[0.1] transition-colors dark:border-white/10';

export const BACKLOG_SECTION_DROP =
  'surface-glass-well overflow-hidden rounded-2xl border border-blue-400/70 !bg-blue-500/[0.1] transition-colors dark:border-blue-400/50 dark:!bg-blue-500/15';

export const BACKLOG_DIVIDE = 'divide-y divide-black/[0.06] dark:divide-white/10';

export const BACKLOG_HAIRLINE = 'border-black/[0.08] dark:border-white/10';

export const BACKLOG_ROW_HOVER =
  'hover:bg-black/[0.04] dark:hover:bg-white/[0.04]';

export const BACKLOG_ROW_SELECTED =
  'bg-blue-500/[0.1] dark:bg-blue-500/15';

export function resolveBacklogSectionChromeClass(dropHighlight: boolean): string {
  return dropHighlight ? BACKLOG_SECTION_DROP : BACKLOG_SECTION_IDLE;
}
