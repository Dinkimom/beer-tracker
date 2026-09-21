'use client';

import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task } from '@/types';

import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { PriorityIcon } from '@/components/PriorityIcon';
import { StatusTag } from '@/components/StatusTag';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { getIncidentSeverityTagClasses } from '@/features/task/utils/incidentSeverityBadgeClasses';
import { formatTaskStoryPointsForDisplay } from '@/lib/pointsUtils';

import { OccupancyTaskCellAssigneeRow } from './OccupancyTaskCellAssigneeRow';

interface OccupancyTaskCellStandardLayoutProps {
  assigneeDisplayName?: string;
  displayKey: string;
  fields: OccupancyRowFieldsVisibility;
  formattedTpCompact: string;
  hasAssigneeRowContent: boolean;
  qaDisplayName?: string;
  shouldShowTp: boolean;
  task: Task;
  unplannedMessage: string | null;
}

export function OccupancyTaskCellStandardLayout({
  assigneeDisplayName,
  displayKey,
  fields,
  formattedTpCompact,
  hasAssigneeRowContent,
  qaDisplayName,
  shouldShowTp,
  task,
  unplannedMessage,
}: OccupancyTaskCellStandardLayoutProps) {
  const { t } = useI18n();
  const issueUrl = useIssueTrackerIssueWebUrl(displayKey);
  return (
    <div className="flex flex-col gap-y-1.5 min-h-0 [&>div]:min-h-[1.25rem] [&>div]:leading-tight">
      {unplannedMessage && (
        <div className="text-xs font-medium text-orange-600 dark:text-orange-400 shrink-0">{unplannedMessage}</div>
      )}
      <p className="min-w-0 line-clamp-3 text-sm font-medium text-gray-900 dark:text-gray-100 break-words leading-tight">
        <a
          className="text-blue-600 dark:text-blue-400 hover:underline"
          href={issueUrl}
          rel="noopener noreferrer"
          target="_blank"
          title={t('task.card.openInTracker', { id: displayKey })}
          onClick={(e) => e.stopPropagation()}
        >
          {displayKey}
        </a>
        {' '}
        {task.name || 'Без названия'}
      </p>
      {hasAssigneeRowContent ? (
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 truncate shrink-0">
          <OccupancyTaskCellAssigneeRow
            assigneeDisplayName={assigneeDisplayName}
            fields={fields}
            qaDisplayName={qaDisplayName}
            shouldShowTp={shouldShowTp}
            task={task}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-1 shrink-0 flex-wrap">
        {fields.showStatus && (
          <StatusTag status={task.originalStatus} statusColorKey={task.statusColorKey} />
        )}
        {fields.showSeverity && task.incidentSeverity && (
          <span
            className={`text-[10px] font-bold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${getIncidentSeverityTagClasses(task.incidentSeverity)}`}
            title={`Критичность: ${task.incidentSeverity}`}
          >
            {task.incidentSeverity}
          </span>
        )}
        {fields.showPriority && task.priority && (
          <span className="inline-flex items-center shrink-0" title={`Приоритет: ${task.priority}`}>
            <PriorityIcon className="w-4 h-4 shrink-0" priority={task.priority} />
          </span>
        )}
        {fields.showType && <IssueTypeIcon className="w-4 h-4 shrink-0" type={task.type} />}
        {(fields.showStoryPoints || fields.showTestPoints) && (
          <div className="flex items-center gap-0 shrink-0 flex-wrap text-xs text-gray-600 dark:text-gray-400">
            {fields.showStoryPoints && (
              <span>{formatTaskStoryPointsForDisplay(task, 'compact')}</span>
            )}
            {fields.showStoryPoints && fields.showTestPoints && <span className="mx-1">·</span>}
            {fields.showTestPoints && <span>{formattedTpCompact}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
