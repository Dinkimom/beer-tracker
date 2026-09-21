'use client';

import type { OccupancyTaskCellProps } from './occupancyTaskCell.types';
import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';
import { useTrackerWebUrlContext } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { getTaskTrackerIssueUrl } from '@/features/task/utils/taskUtils';

import { resolveOccupancyTaskCellContent } from './occupancyTaskCellLayoutHelpers';
import { OccupancyTaskCellToolbar } from './OccupancyTaskCellToolbar';
import { buildOccupancyTaskCellViewModel } from './occupancyTaskCellViewModelHelpers';

export function OccupancyTaskCell(props: OccupancyTaskCellProps) {
  const { t } = useI18n();
  const tracker = useTrackerWebUrlContext();
  const presenceLocked = useSprintCardPresenceLocked(props.mainTask.id);
  const {
    compactShared,
    fields,
    formattedTpCompact,
    hasAssigneeRowContent,
    shouldShowTp,
    unplannedMsg,
  } = buildOccupancyTaskCellViewModel(props);

  const handleOpenMenuUnlessLocked = (e: React.MouseEvent) => {
    if (presenceLocked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    props.onContextMenu?.(e, props.mainTask, false, true);
  };

  const taskCellContent: ReactNode = resolveOccupancyTaskCellContent({
    assigneeDisplayName: props.assigneeDisplayName,
    compactShared,
    displayKey: props.displayKey,
    fields,
    formattedTpCompact,
    hasAssigneeRowContent,
    hasFact: props.hasFact ?? false,
    legacyCompactLayout: props.legacyCompactLayout ?? false,
    qaDisplayName: props.qaDisplayName,
    shouldShowTp,
    task: props.task,
    unplannedMsg,
  });

  return (
    <td
      className="sticky left-0 z-[11] bg-gray-50 dark:bg-gray-900 p-0 align-top relative"
      style={{
        height: props.rowHeightMinusBorder,
        minWidth: props.taskColumnWidth,
        opacity: props.rowOpacity ?? 1,
        transition: 'opacity 0.2s ease',
        verticalAlign: 'top',
        width: props.taskColumnWidth,
      }}
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 pointer-events-none"
        style={{ zIndex: 12 }}
      />
      <div
        className={`flex items-start gap-0 h-full border-l-2 ${
          props.isPlanned
            ? 'border-l-transparent'
            : 'border-l-amber-400 dark:border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20'
        }`}
      >
        {props.dragHandle && (
          <div
            {...props.dragHandle.attributes}
            {...props.dragHandle.listeners}
            className={`cursor-grab active:cursor-grabbing flex-shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${props.legacyCompactLayout ? 'mt-0.5 p-1' : 'mt-1.5'}`}
            title={t('sprintPlanner.occupancy.dragToReorder')}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon
              className={`text-gray-400 dark:text-gray-500 ${props.legacyCompactLayout ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
              name="grip-vertical"
            />
          </div>
        )}
        <div
          ref={props.setTaskRowRef(props.task.id)}
          className={`group relative flex-1 min-w-0 h-full overflow-hidden cursor-pointer transition-colors duration-200 border-l-2 ${
            props.legacyCompactLayout
              ? 'flex items-center h-10 min-h-[2.5rem] px-2'
              : 'flex flex-col min-h-[3rem] px-3 py-2.5 gap-y-1.5'
          } ${
            props.isPlanned
              ? 'border-l-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'border-l-transparent'
          }`}
          data-context-menu-source="occupancy-task-row"
          data-task-id={props.task.id}
          role="button"
          tabIndex={0}
          title={props.task.name}
          onClick={() => props.onTaskClick?.(props.mainTask.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (presenceLocked) {
              e.stopPropagation();
              return;
            }
            props.onContextMenu?.(e, props.mainTask, false, true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              props.onTaskClick?.(props.mainTask.id);
            }
          }}
        >
          <OccupancyTaskCellToolbar
            displayKey={props.displayKey}
            issueUrl={getTaskTrackerIssueUrl(props.mainTask, tracker)}
            onOpenMenu={handleOpenMenuUnlessLocked}
          />
          {taskCellContent}
        </div>
      </div>
    </td>
  );
}
