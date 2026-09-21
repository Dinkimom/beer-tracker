export type NotificationKind =
  | 'assignee_changed'
  | 'availability_changed'
  | 'comment_mention'
  | 'sprint_finished'
  | 'sprint_started';

export interface NotificationPayload {
  actorName?: string;
  assigneeName?: string;
  boardId?: number;
  commentId?: string;
  commentPreview?: string;
  endDate?: string;
  eventType?: string;
  memberName?: string;
  sprintId?: number;
  sprintName?: string;
  startDate?: string;
  taskId?: string;
}

export interface UserNotificationRow {
  actor_user_id: string | null;
  created_at: Date;
  id: string;
  kind: NotificationKind;
  organization_id: string;
  payload: NotificationPayload;
  read_at: Date | null;
  recipient_user_id: string;
}

export interface UserNotificationDto {
  actorAvatarUrl?: string | null;
  actorDisplayName?: string | null;
  actorUserId: string | null;
  createdAt: string;
  id: string;
  kind: NotificationKind;
  payload: NotificationPayload;
  readAt: string | null;
}
