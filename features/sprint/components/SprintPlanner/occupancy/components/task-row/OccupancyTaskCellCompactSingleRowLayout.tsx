'use client';

import type { OccupancyTaskCellCompactShared } from './occupancyTaskCellCompactShared';

import { Avatar } from '@/components/Avatar';
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { PriorityIcon } from '@/components/PriorityIcon';
import { StatusTag } from '@/components/StatusTag';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { getIncidentSeverityTagClasses } from '@/features/task/utils/incidentSeverityBadgeClasses';

/** Компакт без отдельной строки факта: одна строка. */
export function OccupancyTaskCellCompactSingleRowLayout(p: OccupancyTaskCellCompactShared) {
  const {
    assigneeDisplayName,
    devAvatarUrl,
    devAvatarVariant,
    devInitials,
    displayKey,
    fields,
    formattedSp,
    formattedTp,
    qaAvatarUrl,
    qaDisplayName,
    qaInitials,
    shouldShowTp,
    task,
  } = p;
  const { t } = useI18n();
  const issueUrl = useIssueTrackerIssueWebUrl(displayKey);

  return (
    <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap text-[11px] leading-tight text-gray-600 dark:text-gray-400">
      {fields.showStoryPoints && (
        <span className="shrink-0 tabular-nums text-xs text-gray-600 dark:text-gray-400">{formattedSp}</span>
      )}
      {fields.showTestPoints && (
        <span className="shrink-0 tabular-nums text-xs text-gray-600 dark:text-gray-400">{formattedTp}</span>
      )}
      {fields.showAssignee && (
        <span className="shrink-0 flex items-center justify-center">
          <Avatar
            avatarUrl={devAvatarUrl ?? undefined}
            initials={devInitials || '—'}
            initialsVariant={devAvatarVariant}
            size="xs"
            title={assigneeDisplayName || 'Разработчик'}
          />
        </span>
      )}
      {fields.showQa && (
        <span className="shrink-0 flex items-center justify-center">
          {shouldShowTp ? (
            <Avatar
              avatarUrl={qaAvatarUrl ?? undefined}
              initials={qaInitials || '—'}
              initialsVariant="qa"
              size="xs"
              title={qaDisplayName || 'QA-инженер'}
            />
          ) : (
            <Avatar
              avatarUrl={undefined}
              initials="—"
              initialsVariant="qa"
              size="xs"
              title="QA-инженер"
            />
          )}
        </span>
      )}
      <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug text-left">
        {fields.showStatus && (
          <StatusTag
            className="mr-1 inline-block align-middle"
            status={task.originalStatus}
            statusColorKey={task.statusColorKey}
          />
        )}
        {fields.showSeverity && task.incidentSeverity && (
          <span
            className={`mr-1 inline-block align-middle text-[10px] font-bold leading-none whitespace-nowrap px-1.5 py-0.5 rounded border ${getIncidentSeverityTagClasses(task.incidentSeverity)}`}
            title={`Критичность: ${task.incidentSeverity}`}
          >
            {task.incidentSeverity}
          </span>
        )}
        {fields.showPriority && task.priority && (
          <span
            className="inline-flex items-center align-middle mr-0.5"
            title={`Приоритет: ${task.priority}`}
          >
            <PriorityIcon className="w-4 h-4 shrink-0" priority={task.priority} />
          </span>
        )}
        {fields.showType && <IssueTypeIcon className="w-4 h-4 shrink-0 mr-0.5" type={task.type} />}
        {fields.showKey && (
          <>
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline shrink-0 text-xs"
              href={issueUrl}
              rel="noopener noreferrer"
              target="_blank"
              title={t('task.card.openInTracker', { id: displayKey })}
              onClick={(e) => e.stopPropagation()}
            >
              {displayKey}
            </a>
            {' '}
          </>
        )}
        {task.name || 'Без названия'}
      </span>
    </div>
  );
}
