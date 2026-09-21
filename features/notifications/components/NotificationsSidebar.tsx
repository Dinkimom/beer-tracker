'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { SidebarResizeHandle } from '@/components/SidebarResizeHandle';
import { ZIndex } from '@/constants';
import { NotificationsPanelBody } from '@/features/notifications/components/NotificationsPanelBody';
import { NotificationsSidebarHeader } from '@/features/notifications/components/NotificationsSidebarHeader';
import { useResize } from '@/features/sidebar/hooks/useResize';
import { useNotificationsSidebarWidthStorage } from '@/hooks/useLocalStorage';
import { useNotifications } from '@/hooks/useNotifications';
import { useSidePanelPresence } from '@/hooks/useSidePanelPresence';

const NOTIFICATIONS_SIDEBAR_DEFAULT_WIDTH_PX = 380;
const NOTIFICATIONS_SIDEBAR_MIN_WIDTH_PX = 320;
const NOTIFICATIONS_SIDEBAR_MAX_WIDTH_PX = 720;

const emptySubscribe = () => () => {};

interface NotificationsSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsSidebar({ open, onClose }: NotificationsSidebarProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => typeof document !== 'undefined',
    () => false
  );
  const presence = useSidePanelPresence(open);
  const [width, setWidth] = useNotificationsSidebarWidthStorage(
    NOTIFICATIONS_SIDEBAR_DEFAULT_WIDTH_PX
  );
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllRead,
    clearAll,
    deleteNotification,
    isClearingAll,
    isMarkingAllRead,
    refetch,
  } = useNotifications();

  const { isResizing, setIsResizing } = useResize({
    calculateValue: (event) => window.innerWidth - event.clientX,
    onValueChange: setWidth,
    min: NOTIFICATIONS_SIDEBAR_MIN_WIDTH_PX,
    max: NOTIFICATIONS_SIDEBAR_MAX_WIDTH_PX,
    clamp: true,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    refetch().catch(() => undefined);
  }, [open, refetch]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!isResizing) {
      return;
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  if (!presence.mounted || !mounted) {
    return null;
  }

  return createPortal(
    <div
      aria-hidden={presence.isExiting}
      aria-modal="false"
      className={`${presence.className} fixed inset-y-0 right-0 flex ${ZIndex.class('sidePanel')}`}
      role="complementary"
      style={{
        width,
        zIndex: ZIndex.sidePanel,
      }}
      onAnimationEnd={presence.onAnimationEnd}
    >
      <div className="relative flex h-full w-full flex-col border-l border-ds-border-subtle bg-ds-surface-header shadow-xl">
        <NotificationsSidebarHeader
          hasNotifications={notifications.length > 0}
          isClearingAll={isClearingAll}
          isMarkingAllRead={isMarkingAllRead}
          unreadCount={unreadCount}
          onClearAll={() => clearAll()}
          onClose={onClose}
          onMarkAllRead={() => markAllRead()}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NotificationsPanelBody
            isLoading={isLoading}
            notifications={notifications}
            onActivate={(item) => {
              if (item.readAt == null) {
                markAsRead(item.id);
              }
            }}
            onDelete={deleteNotification}
          />
        </div>

        <SidebarResizeHandle
          isResizing={isResizing}
          linesCount={3}
          side="left"
          widthClassName="w-1.5"
          zIndexClassName={ZIndex.class('sidebarResize')}
          onMouseDown={(event) => {
            event.preventDefault();
            setIsResizing(true);
          }}
        />
      </div>
    </div>,
    document.body
  );
}
