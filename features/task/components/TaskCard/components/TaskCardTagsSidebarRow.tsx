'use client';

import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';
import type { Task } from '@/types';

import { StatusTag } from '@/components/StatusTag';
import { getIncidentSeverityTagClasses } from '@/features/task/utils/incidentSeverityBadgeClasses';

import { SlaBugSignalTag } from './SlaBugSignalTag';

interface TaskCardTagsSidebarRowProps {
  dangerousReleaseColorClasses: string;
  dangerousReleaseValue: string | undefined;
  hideTestPoints: boolean;
  inlineLayout: boolean;
  showDangerousReleaseInsteadOfStatus: boolean;
  slaBugDemoteReason?: SlaBugDemoteReason;
  slaBugSignalLabel?: SlaBugLabelKey;
  spText: string;
  tagTextSize: string;
  task: Task;
  tpText: string;
}

export function TaskCardTagsSidebarRow({
  dangerousReleaseColorClasses,
  dangerousReleaseValue,
  hideTestPoints,
  inlineLayout,
  showDangerousReleaseInsteadOfStatus,
  slaBugDemoteReason,
  slaBugSignalLabel,
  spText,
  tagTextSize,
  task,
  tpText,
}: TaskCardTagsSidebarRowProps) {
  const tagsRowClass = inlineLayout
    ? 'flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0'
    : 'flex items-center gap-2 min-w-0 overflow-hidden';

  return (
    <div className={tagsRowClass}>
      {showDangerousReleaseInsteadOfStatus ? (
        <span
          className={`text-[12px] font-semibold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${dangerousReleaseColorClasses}`}
        >
          {`Опасность: ${dangerousReleaseValue || '—'}`}
        </span>
      ) : (
        <StatusTag status={task.originalStatus} statusColorKey={task.statusColorKey} />
      )}
      {task.incidentSeverity ? (
        <span
          className={`text-[10px] font-bold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${getIncidentSeverityTagClasses(task.incidentSeverity)}`}
          title={`Критичность: ${task.incidentSeverity}`}
        >
          {task.incidentSeverity}
        </span>
      ) : null}
      <div className={`flex items-center gap-0 shrink-0 flex-wrap ${tagTextSize} text-gray-600 dark:text-white`}>
        <span>{spText}</span>
        {!hideTestPoints ? (
          <>
            <span className="mx-1">·</span>
            <span>{tpText}</span>
          </>
        ) : null}
        {slaBugSignalLabel ? (
          <>
            <span className="mx-1">·</span>
            <SlaBugSignalTag
              createdAt={task.createdAt}
              demoteReason={slaBugDemoteReason}
              hdCount={task.hdCount}
              incidentSeverity={task.incidentSeverity}
              issueKey={task.id}
              label={slaBugSignalLabel}
              lastHdAt={task.lastHdAt}
              slaDeadline={task.slaDeadline}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
