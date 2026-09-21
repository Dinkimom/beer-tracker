'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useDemoPlannerShell } from '@/contexts/DemoPlannerShellContext';
import {
  clearAllNotifications,
  deleteNotification as deleteNotificationApi,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';

const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

type NotificationsListResponse = Awaited<ReturnType<typeof fetchNotifications>>;

function patchNotificationReadState(
  data: NotificationsListResponse | undefined,
  notificationId: string
): NotificationsListResponse | undefined {
  if (!data) {
    return data;
  }

  const readAt = new Date().toISOString();
  const notifications = data.notifications.map((item) =>
    item.id === notificationId && item.readAt == null ? { ...item, readAt } : item
  );
  const unreadCount = notifications.filter((item) => item.readAt == null).length;

  return { notifications, unreadCount };
}

export function useNotifications() {
  const { isDemoPlanner } = useDemoPlannerShell();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => fetchNotifications(),
    enabled: !isDemoPlanner,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationsListResponse>(NOTIFICATIONS_QUERY_KEY);
      queryClient.setQueryData<NotificationsListResponse>(NOTIFICATIONS_QUERY_KEY, (current) =>
        patchNotificationReadState(current, notificationId)
      );
      return { previous };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotificationApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    clearAll: clearAllMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isClearingAll: clearAllMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
  };
}
