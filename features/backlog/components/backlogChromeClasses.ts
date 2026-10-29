/** Общий остров бэклога — та же рамка, что у доски и ретро. */
export const BACKLOG_ISLAND =
  'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-ds-surface-header';

/** Секции внутри острова — без своей рамки, разделены линиями. */
export const BACKLOG_SECTION_IDLE = 'transition-colors';

export const BACKLOG_SECTION_DROP =
  'bg-blue-50 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.7)] transition-colors dark:bg-blue-950/40';

/** Шапка секции липкая, поэтому фон непрозрачный — чуть темнее/светлее острова. */
export const BACKLOG_SECTION_HEADER =
  'bg-gray-50 dark:bg-[color-mix(in_srgb,var(--ds-surface-header)_94%,white)]';

export const BACKLOG_SECTION_HEADER_DROP = 'bg-blue-50 dark:bg-blue-950';

export const BACKLOG_DIVIDE = 'divide-y divide-black/[0.06] dark:divide-white/10';

export const BACKLOG_HAIRLINE = 'border-black/[0.08] dark:border-white/10';

export const BACKLOG_ROW_HOVER =
  'hover:bg-black/[0.04] dark:hover:bg-white/[0.04]';

export const BACKLOG_ROW_SELECTED =
  'bg-blue-500/[0.1] dark:bg-blue-500/15';

export function resolveBacklogSectionChromeClass(dropHighlight: boolean): string {
  return dropHighlight ? BACKLOG_SECTION_DROP : BACKLOG_SECTION_IDLE;
}
