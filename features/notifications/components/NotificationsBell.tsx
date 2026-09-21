'use client';

import { useState } from 'react';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { useI18n } from '@/contexts/LanguageContext';
import { NotificationsSidebar } from '@/features/notifications/components/NotificationsSidebar';
import { NotificationsUnreadBadge } from '@/features/notifications/components/NotificationsUnreadBadge';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationsBell() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const panelTitle = t('notifications.panelTitle');
  const ariaLabel =
    unreadCount > 0
      ? t('notifications.bellAriaWithUnread', { count: unreadCount })
      : t('notifications.bellAria');

  return (
    <>
      <HeaderIconButton
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className="relative"
        title={panelTitle}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg
          aria-hidden
          className="h-4 w-4 text-ds-text-muted"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        <NotificationsUnreadBadge count={unreadCount} />
      </HeaderIconButton>

      <NotificationsSidebar open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
