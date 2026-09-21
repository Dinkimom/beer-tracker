'use client';

import type { NotificationKind, NotificationPayload, UserNotificationDto } from '@/lib/notifications/types';
import type { MouseEvent } from 'react';

import Link from 'next/link';

import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';

const AVAILABILITY_EVENT_TYPE_KEYS: Record<string, string> = {
  vacation: 'notifications.eventTypes.vacation',
  tech_sprint: 'notifications.eventTypes.techSprint',
  sick_leave: 'notifications.eventTypes.sickLeave',
  duty: 'notifications.eventTypes.duty',
};

type TranslateFn = (key: string, params?: Record<string, number | string>) => string;

export function getNotificationActorDisplayName(
  item: Pick<UserNotificationDto, 'actorDisplayName' | 'payload'>,
  t: TranslateFn
): string {
  return item.actorDisplayName?.trim() || item.payload.actorName?.trim() || t('notifications.someone');
}

export function formatNotificationBody(
  kind: NotificationKind,
  payload: NotificationPayload,
  t: TranslateFn
): string {
  switch (kind) {
    case 'assignee_changed':
      return t('notifications.messages.assigneeChangedAction');
    case 'availability_changed': {
      const eventKey =
        AVAILABILITY_EVENT_TYPE_KEYS[payload.eventType ?? ''] ?? 'notifications.eventTypes.other';
      return t('notifications.messages.availabilityChangedAction', {
        memberName: payload.memberName ?? '—',
        eventType: t(eventKey),
        startDate: payload.startDate ?? '—',
        endDate: payload.endDate ?? '—',
      });
    }
    case 'sprint_started':
      return t('notifications.messages.sprintStartedAction', {
        sprintName: payload.sprintName ?? '—',
      });
    case 'sprint_finished':
      return t('notifications.messages.sprintFinishedAction', {
        sprintName: payload.sprintName ?? '—',
      });
    case 'comment_mention':
      return t('notifications.messages.commentMentionAction');
    default:
      return t('notifications.messages.generic');
  }
}

const plannerLinkClassName =
  'font-medium text-blue-600 hover:underline dark:text-blue-400';

interface NotificationListItemMessageProps {
  item: UserNotificationDto;
  plannerHref?: string | null;
}

export function NotificationListItemMessage({ item, plannerHref }: NotificationListItemMessageProps) {
  const { t } = useI18n();
  const { kind, payload } = item;
  const bodyClassName = 'text-sm leading-snug text-gray-700 dark:text-gray-300';
  const openPlannerLabel = t('notifications.openInPlanner');
  const taskId = payload.taskId?.trim() || '—';
  const assigneeTaskUrl = useIssueTrackerIssueWebUrl(taskId === '—' ? '' : taskId);

  function stopRowActivation(event: MouseEvent) {
    event.stopPropagation();
  }

  if (kind === 'assignee_changed') {
    const taskUrl = taskId !== '—' ? assigneeTaskUrl : null;

    return (
      <p className={bodyClassName}>
        {t('notifications.messages.assigneeChangedAction')}{' '}
        {taskUrl ? (
          <a
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            href={taskUrl}
            rel="noopener noreferrer"
            target="_blank"
            onClick={stopRowActivation}
          >
            {taskId}
          </a>
        ) : (
          taskId
        )}
        {plannerHref ? (
          <>
            {' · '}
            <Link className={plannerLinkClassName} href={plannerHref} onClick={stopRowActivation}>
              {openPlannerLabel}
            </Link>
          </>
        ) : null}
      </p>
    );
  }

  if (kind === 'comment_mention') {
    const preview = payload.commentPreview?.trim();
    return (
      <p className={bodyClassName}>
        {t('notifications.messages.commentMentionAction')}
        {preview ? (
          <>
            {' '}
            {t('notifications.messages.commentMentionPreview', { preview })}
          </>
        ) : null}
        {plannerHref ? (
          <>
            {' · '}
            <Link className={plannerLinkClassName} href={plannerHref} onClick={stopRowActivation}>
              {openPlannerLabel}
            </Link>
          </>
        ) : null}
      </p>
    );
  }

  if (plannerHref) {
    return (
      <p className={bodyClassName}>
        {formatNotificationBody(kind, payload, t)}{' '}
        <Link className={plannerLinkClassName} href={plannerHref} onClick={stopRowActivation}>
          {openPlannerLabel}
        </Link>
      </p>
    );
  }

  return <p className={bodyClassName}>{formatNotificationBody(kind, payload, t)}</p>;
}
