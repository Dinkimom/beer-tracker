'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { notificationsPanelHeaderClass } from '@/features/notifications/components/notificationsPanelStyles';

interface NotificationsSidebarHeaderProps {
  hasNotifications: boolean;
  isClearingAll: boolean;
  isMarkingAllRead: boolean;
  unreadCount: number;
  onClearAll: () => void;
  onClose: () => void;
  onMarkAllRead: () => void;
}

export function NotificationsSidebarHeader({
  hasNotifications,
  isClearingAll,
  isMarkingAllRead,
  unreadCount,
  onClearAll,
  onClose,
  onMarkAllRead,
}: NotificationsSidebarHeaderProps) {
  const { t } = useI18n();

  return (
    <header className={`shrink-0 ${notificationsPanelHeaderClass}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h2 className="whitespace-nowrap text-lg font-semibold leading-none text-gray-900 dark:text-gray-100">
          {t('notifications.panelTitle')}
        </h2>
        {unreadCount > 0 ? (
          <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {unreadCount > 0 ? (
          <HeaderIconButton
            aria-label={t('notifications.markAllRead')}
            className="disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isMarkingAllRead}
            title={t('notifications.markAllRead')}
            type="button"
            onClick={onMarkAllRead}
          >
            <Icon className="h-4 w-4" name="check-circle" />
          </HeaderIconButton>
        ) : null}
        {hasNotifications ? (
          <HeaderIconButton
            aria-label={t('notifications.clearAll')}
            className="hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-red-400"
            disabled={isClearingAll}
            title={t('notifications.clearAll')}
            type="button"
            onClick={onClearAll}
          >
            <Icon className="h-4 w-4" name="trash" />
          </HeaderIconButton>
        ) : null}
        <HeaderIconButton
          aria-label={t('common.close')}
          title={t('common.close')}
          type="button"
          onClick={onClose}
        >
          <Icon className="h-4 w-4" name="x" />
        </HeaderIconButton>
      </div>
    </header>
  );
}
