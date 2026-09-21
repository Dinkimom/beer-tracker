'use client';

import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { StatusTag } from '@/components/StatusTag';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';

interface OccupancyParentRowToggleButtonLabelsProps {
  displayLabel: string;
  isInGoals: boolean;
  issueType?: string;
  quarterlySplitTaskColumns: boolean;
  row: { id: string; display: string; key?: string };
  status?: string;
  t: (key: string, values?: Record<string, string>) => string;
}

export function OccupancyParentRowToggleButtonLabels({
  displayLabel,
  isInGoals,
  issueType,
  quarterlySplitTaskColumns,
  row,
  status,
  t,
}: OccupancyParentRowToggleButtonLabelsProps) {
  const issueUrl = useIssueTrackerIssueWebUrl(row.key ?? '');
  return (
    <>
      {isInGoals ? (
        <span className="mr-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap border bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700">
          {t('sprintPlanner.occupancy.sprintGoalBadge')}
        </span>
      ) : null}
      {!quarterlySplitTaskColumns && status ? (
        <StatusTag className="mr-1" status={status} />
      ) : null}
      {issueType ? <IssueTypeIcon className="w-4 h-4 shrink-0" type={issueType} /> : null}
      {row.key ? (
        <a
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          href={issueUrl}
          rel="noopener noreferrer"
          target="_blank"
          title={t('sprintPlanner.occupancy.openInTracker', { key: row.key })}
          onClick={(e) => e.stopPropagation()}
        >
          {row.key}
        </a>
      ) : null}
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate min-w-0 whitespace-nowrap">
        {displayLabel}
      </span>
    </>
  );
}
