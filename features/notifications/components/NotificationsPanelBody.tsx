'use client';

import type { UserNotificationDto } from '@/lib/notifications/types';

import { useI18n } from '@/contexts/LanguageContext';
import { NotificationListItem } from '@/features/notifications/components/NotificationListItem';
import { notificationsPanelEmptyClass } from '@/features/notifications/components/notificationsPanelStyles';

interface NotificationsPanelBodyProps {
  isLoading: boolean;
  notifications: UserNotificationDto[];
  onActivate: (item: UserNotificationDto) => void;
  onDelete: (id: string) => void;
}

export function NotificationsPanelBody({
  isLoading,
  notifications,
  onActivate,
  onDelete,
}: NotificationsPanelBodyProps) {
  const { t } = useI18n();

  if (isLoading) {
    return <p className={notificationsPanelEmptyClass}>{t('common.loading')}</p>;
  }

  if (notifications.length === 0) {
    return <p className={notificationsPanelEmptyClass}>{t('notifications.empty')}</p>;
  }

  return (
    <>
      {notifications.map((item) => (
        <NotificationListItem key={item.id} item={item} onActivate={onActivate} onDelete={onDelete} />
      ))}
    </>
  );
}
