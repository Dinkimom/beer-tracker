/**
 * Активная вкладка выделяется только primary на подписи и иконке.
 * В покое нет ни кромки, ни заливки; hover — та же вуаль, что у соседних пунктов.
 */
const ACTIVE_TAB_CLASS =
  'border !border-transparent !bg-transparent !text-blue-600 hover:!bg-black/[0.05] active:!bg-black/10 dark:!text-blue-300 dark:hover:!bg-white/10 dark:active:!bg-white/15';

const INACTIVE_TAB_CLASS =
  'border !border-transparent !bg-transparent !text-ds-text-muted hover:!bg-black/[0.05] hover:!text-gray-900 active:!bg-black/10 dark:hover:!bg-white/10 dark:hover:!text-gray-100 dark:active:!bg-white/15';

export function pageHeaderMainPageButtonClass(isActive: boolean): string {
  return isActive ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS;
}
