import type { UserNotificationDto } from '@/lib/notifications/types';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

interface NotificationsListResponse {
  notifications: UserNotificationDto[];
  unreadCount: number;
}

export async function fetchNotifications(limit = 50): Promise<NotificationsListResponse> {
  const response = await getPlannerBeerTrackerApi().get<NotificationsListResponse>('/notifications', {
    params: { limit },
  });
  return response.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await getPlannerBeerTrackerApi().patch('/notifications', { markAllRead: true });
}

export async function clearAllNotifications(): Promise<void> {
  await getPlannerBeerTrackerApi().delete('/notifications');
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await getPlannerBeerTrackerApi().delete(`/notifications/${notificationId}`);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await getPlannerBeerTrackerApi().patch(`/notifications/${notificationId}/read`);
}
