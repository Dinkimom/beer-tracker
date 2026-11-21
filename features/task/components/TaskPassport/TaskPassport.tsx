'use client';

import type { Task } from '@/types';

import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { taskStatusLabel } from '@/features/task/utils/taskUtils';
import { formatPointsForDisplay } from '@/lib/pointsUtils';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

function shortDate(value: string | undefined): string | null {
  const match = value ? DATE_ONLY.exec(value) : null;
  return match ? `${match[3]}.${match[2]}.${match[1]}` : null;
}

function estimateText(task: Task): string | null {
  const parts: string[] = [];
  if (task.storyPoints != null) parts.push(`${formatPointsForDisplay(task.storyPoints)} SP`);
  if (task.testPoints != null && !task.hideTestPointsByIntegration) {
    parts.push(`${formatPointsForDisplay(task.testPoints)} TP`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Последний спринт задачи (в трекере их может быть несколько — текущий в конце). */
function sprintText(task: Task): string | null {
  const sprint = task.sprints?.at(-1);
  return sprint?.display?.trim() || sprint?.name?.trim() || null;
}

/**
 * Паспорт задачи: компактная сводка для всплывающих подсказок — ключ, статус, название,
 * исполнители, оценка, спринт, родитель и срок. Только чтение, без действий.
 */
export function TaskPassport({ task }: { task: Task }) {
  const { t } = useI18n();
  const parent = task.parent ?? task.epic;
  const rows: Array<{ label: string; value: string | null }> = [
    { label: t('taskPassport.assignee'), value: task.assigneeName?.trim() || t('taskPassport.noAssignee') },
    { label: t('taskPassport.qa'), value: task.qaEngineerName?.trim() || null },
    { label: t('taskPassport.estimate'), value: estimateText(task) },
    { label: t('taskPassport.sprint'), value: sprintText(task) },
    { label: t('taskPassport.parent'), value: parent ? `${parent.key} · ${parent.display}` : null },
    { label: t('taskPassport.deadline'), value: shortDate(task.deadline) },
  ];

  return (
    <div className="w-72 px-3 py-2.5 text-left" data-testid="task-passport">
      <div className="flex min-w-0 items-center gap-1.5">
        <IssueTypeIcon className="h-3.5 w-3.5 shrink-0" type={task.type} />
        <span className="shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300">{task.id}</span>
        <span className="ml-auto min-w-0">
          <StatusTag label={taskStatusLabel(task)} status={task.originalStatus} statusColorKey={task.statusColorKey} />
        </span>
      </div>
      <p className="mt-1.5 line-clamp-3 text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">{task.name}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows
          .filter((row) => row.value)
          .map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-gray-500 dark:text-gray-400">{row.label}</dt>
              <dd className="min-w-0 truncate text-gray-800 dark:text-gray-200">{row.value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
