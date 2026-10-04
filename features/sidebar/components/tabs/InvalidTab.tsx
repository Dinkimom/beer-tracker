'use client';

import type { ValidationIssue } from '@/features/task/utils/taskValidation';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { SidebarTaskGroupLabel } from '@/features/sidebar/components/SidebarTaskGroupLabel';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';
import { sidebarTaskGroupContainerClass } from '@/features/sidebar/utils/sidebarTaskGroupContainerClass';
import { formatTaskGroupLabel } from '@/features/task/utils/formatTaskGroupLabel';
import { getSidebarTaskGroupKey } from '@/features/task/utils/taskSidebarGroupKey';

function validationMessage(issue: ValidationIssue, t: (k: string, p?: Record<string, number | string>) => string) {
  return t(`task.validation.${issue.type}`, issue.params);
}

/**
 * Вкладка «Невалидные». Скрыта из сайдбара (`SIDEBAR_INVALID_TAB_ENABLED`),
 * пока критерии невалидности не станут настраиваемыми вместо хардкода.
 */
export function InvalidTab() {
  const { t } = useI18n();
  const {
    invalidTasks,
    groupBy,
    setGroupBy,
    groupKeys,
    groupedTasks,
    developers,
  } = useTaskSidebar();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
            {t('task.invalidTab.groupingLabel')}
          </span>
          <div className="flex gap-1">
            <Button
              className="rounded px-2.5 py-1 text-xs font-medium"
              title={t('task.invalidTab.groupNoneTitle')}
              type="button"
              variant={groupBy === 'none' ? 'outline' : 'secondary'}
              onClick={() => setGroupBy('none')}
            >
              {t('task.invalidTab.groupNoneButton')}
            </Button>
            <Button
              className="rounded px-2.5 py-1 text-xs font-medium"
              title={t('task.invalidTab.groupAssigneeTitle')}
              type="button"
              variant={groupBy === 'assignee' ? 'outline' : 'secondary'}
              onClick={() => setGroupBy('assignee')}
            >
              {t('task.invalidTab.groupAssigneeButton')}
            </Button>
            <Button
              className="rounded px-2.5 py-1 text-xs font-medium"
              title={t('task.invalidTab.groupParentTitle')}
              type="button"
              variant={groupBy === 'parent' ? 'outline' : 'secondary'}
              onClick={() => setGroupBy('parent')}
            >
              {t('task.invalidTab.groupParentButton')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {invalidTasks.length === 0 ? (
          <div className="flex min-h-full items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('task.invalidTab.allGood')}</p>
          </div>
        ) : (
          groupKeys.map((groupKey, groupIndex) => {
            const tasksInGroup = groupedTasks[groupKey];
            if (tasksInGroup.length === 0) return null;

            const isLastGroup = groupIndex === groupKeys.length - 1;

            const invalidTasksInGroup = invalidTasks.filter(({ task }) => {
              if (groupBy === 'none') return true;
              const taskGroupKey = getSidebarTaskGroupKey(task, groupBy, developers);
              return taskGroupKey === groupKey;
            });

            return (
              <div
                key={groupKey}
                className={sidebarTaskGroupContainerClass(groupBy, isLastGroup)}
              >
                {groupBy !== 'none' && (
                  <SidebarTaskGroupLabel
                    count={invalidTasksInGroup.length}
                    label={formatTaskGroupLabel(groupKey, t)}
                  />
                )}
                <div className="space-y-2.5">
                  {invalidTasksInGroup.map(({ task, issues }) => (
                    <div
                      key={task.id}
                      className="bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-800 rounded-lg p-3"
                    >
                      <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <a
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                          href={task.link}
                          rel="noopener noreferrer"
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.id}
                        </a>
                        <span className="font-semibold">
                          {' - ['}
                          {task.team}
                          {']'}
                          {task.productTeam?.length ? task.productTeam.map((p) => ` [${p}]`).join('') : ''}{' '}
                          {task.name}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t('task.invalidTab.issuesLabel')}
                        </span>
                        <ul className="space-y-0.5 text-xs text-gray-700 dark:text-gray-300">
                          {issues.map((issue) => (
                            <li key={`${task.id}-${issue.type}`}>• {validationMessage(issue, t)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
