'use client';

import type { UserNotificationDto } from '@/lib/notifications/types';
import type { KeyboardEvent } from 'react';

import { useRouter } from 'next/navigation';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  getNotificationActorDisplayName,
  NotificationListItemMessage,
} from '@/features/notifications/components/NotificationListItemMessage';
import {
  notificationsListItemClass,
  notificationsListItemNameClass,
} from '@/features/notifications/components/notificationsPanelStyles';
import { formatNotificationTime } from '@/features/notifications/utils/formatNotificationText';
import { resolveNotificationPlannerHref } from '@/features/notifications/utils/notificationPlannerHref';
import { getInitials } from '@/utils/displayUtils';

interface NotificationListItemProps {
  item: UserNotificationDto;
  onActivate: (item: UserNotificationDto) => void;
  onDelete: (id: string) => void;
}

export function NotificationListItem({ item, onActivate, onDelete }: NotificationListItemProps) {
  const router = useRouter();
  const { language, t } = useI18n();
  const isUnread = item.readAt == null;
  const actorName = getNotificationActorDisplayName(item, t);
  const localeTag = language === 'ru' ? 'ru-RU' : 'en-US';
  const timeLabel = formatNotificationTime(item.createdAt, localeTag);
  const plannerHref = resolveNotificationPlannerHref(item.payload, item.kind);

  function handleActivate() {
    onActivate(item);
    if (plannerHref) {
      router.push(plannerHref);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate();
    }
  }

  const isInteractive = isUnread || plannerHref != null;

  return (
    <div
      className={`group relative ${notificationsListItemClass(isUnread)} ${
        isInteractive ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]' : ''
      }`}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleActivate : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      <Avatar
        avatarUrl={item.actorAvatarUrl}
        className="mt-0.5"
        initials={getInitials(actorName)}
        initialsVariant="primary"
        size="md"
        title={actorName}
      />

      <div className="min-w-0 flex-1 pr-6">
        <p className={notificationsListItemNameClass(isUnread)}>{actorName}</p>
        <NotificationListItemMessage item={item} plannerHref={plannerHref} />
        <p className="mt-1 text-xs text-ds-text-muted">{timeLabel}</p>
      </div>

      <button
        aria-label={t('notifications.deleteOne')}
        className="absolute right-2 top-3 rounded p-1 text-ds-text-muted opacity-0 transition-opacity hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-white/[0.06] dark:hover:text-red-400"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(item.id);
        }}
      >
        <Icon className="h-4 w-4" name="x" />
      </button>
    </div>
  );
}
