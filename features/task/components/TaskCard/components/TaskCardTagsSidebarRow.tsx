'use client';

import type { Task } from '@/types';

import { StatusTag } from '@/components/StatusTag';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { getIncidentSeverityTagClasses } from '@/features/task/utils/incidentSeverityBadgeClasses';
import { taskStatusLabel } from '@/features/task/utils/taskUtils';


interface TaskCardTagsSidebarRowProps {
  dangerousReleaseColorClasses: string;
  dangerousReleaseValue: string | undefined;
  hideTestPoints: boolean;
  showDangerousReleaseInsteadOfStatus: boolean;
  showStoryPoints: boolean;
  showTestPoints: boolean;
  spText: string;
  tagTextSize: string;
  task: Task;
  tpText: string;
}

export function TaskCardTagsSidebarRow({
  dangerousReleaseColorClasses,
  dangerousReleaseValue,
  hideTestPoints,
  showStoryPoints,
  showTestPoints,
  showDangerousReleaseInsteadOfStatus,
  spText,
  tagTextSize,
  task,
  tpText,
}: TaskCardTagsSidebarRowProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
      {showDangerousReleaseInsteadOfStatus ? (
        <span
          className={`text-[12px] font-semibold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${dangerousReleaseColorClasses}`}
        >
          {`Опасность: ${dangerousReleaseValue || '—'}`}
        </span>
      ) : (
        <StatusTag
          label={taskStatusLabel(task)}
          status={task.originalStatus}
          statusColorKey={task.statusColorKey}
        />
      )}
      {task.incidentSeverity ? (
        <TextTooltip content={t('task.card.severityValue', { value: task.incidentSeverity })}>
        <span
          className={`text-[10px] font-bold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${getIncidentSeverityTagClasses(task.incidentSeverity)}`}
        >
          {task.incidentSeverity}
        </span>
        </TextTooltip>
      ) : null}
      <div className={`flex items-center gap-0 shrink-0 flex-wrap ${tagTextSize} text-gray-600 dark:text-white`}>
        {showStoryPoints ? <span>{spText}</span> : null}
        {showTestPoints && !hideTestPoints ? (
          <>
            {showStoryPoints ? <span className="mx-1">·</span> : null}
            <span>{tpText}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
