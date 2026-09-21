'use client';

import type { OccupancyTaskCellCompactShared } from './occupancyTaskCellCompactShared';

import { Avatar } from '@/components/Avatar';
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { PriorityIcon } from '@/components/PriorityIcon';
import { StatusTag } from '@/components/StatusTag';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { getIncidentSeverityTagClasses } from '@/features/task/utils/incidentSeverityBadgeClasses';

/** Компакт + факт: две строки (оценки/аватары/иконки, затем ключ + название). */
export function OccupancyTaskCellCompactWithFactLayout(p: OccupancyTaskCellCompactShared) {
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
    <div className="flex flex-col justify-center gap-2 min-w-0 w-full">
      <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap">
        {fields.showStoryPoints && (
          <span className="shrink-0 tabular-nums text-xs text-gray-500 dark:text-gray-400">{formattedSp}</span>
        )}
        {fields.showTestPoints && (
          <span className="shrink-0 tabular-nums text-xs text-gray-500 dark:text-gray-400">{formattedTp}</span>
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
        {fields.showStatus && (
          <StatusTag
            className="inline-block align-middle"
            status={task.originalStatus}
            statusColorKey={task.statusColorKey}
          />
        )}
        {fields.showSeverity && task.incidentSeverity && (
          <span
            className={`shrink-0 text-[10px] font-bold leading-none whitespace-nowrap px-1.5 py-0.5 rounded border ${getIncidentSeverityTagClasses(task.incidentSeverity)}`}
            title={`Критичность: ${task.incidentSeverity}`}
          >
            {task.incidentSeverity}
          </span>
        )}
        {fields.showPriority && task.priority && (
          <span className="shrink-0 inline-flex items-center" title={`Приоритет: ${task.priority}`}>
            <PriorityIcon className="w-4 h-4 shrink-0" priority={task.priority} />
          </span>
        )}
        {fields.showType && <IssueTypeIcon className="w-4 h-4 shrink-0" type={task.type} />}
      </div>
      <div className="flex items-center min-w-0 overflow-hidden">
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug text-left whitespace-nowrap">
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
    </div>
  );
}
