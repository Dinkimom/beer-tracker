/** Общие стили списка уведомлений. */
export const notificationsPanelHeaderClass =
  'flex h-[73px] justify-between gap-2 border-b border-ds-border-subtle px-4';

export const notificationsPanelEmptyClass =
  'px-4 py-10 text-center text-sm text-ds-text-muted';

export const notificationsListItemClass = (isUnread: boolean): string =>
  [
    'flex gap-3 border-b border-ds-border-subtle px-4 py-3 transition-colors last:border-b-0',
    'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
    isUnread ? 'bg-gray-50/80 dark:bg-white/[0.03]' : '',
  ]
    .filter(Boolean)
    .join(' ');

export const notificationsListItemNameClass = (isUnread: boolean): string =>
  isUnread
    ? 'truncate text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100'
    : 'truncate text-sm font-medium leading-snug text-gray-900 dark:text-gray-100';
