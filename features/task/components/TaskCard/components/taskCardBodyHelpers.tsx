import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant } from '@/types';

import { StatusTag } from '@/components/StatusTag';
import { getIncidentSeverityTagClasses } from '@/features/task/utils/incidentSeverityBadgeClasses';
import {
  formatTaskStoryPointsForDisplay,
  formatTaskTestPointsForDisplay,
  timeslotsToStoryPoints,
} from '@/lib/pointsUtils';

import { isQuickAddChooserDraft } from './taskCardContentHelpers';

function isSwimlaneNoteOrPolaroid(task: Pick<Task, 'localDraftKind'>): boolean {
  return task.localDraftKind === 'comment' || task.localDraftKind === 'diagram' || task.localDraftKind === 'image';
}

export function shouldShowTaskCardSwimlaneMetaRow(input: {
  isVeryNarrow: boolean;
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
  task: Task;
  variant: TaskCardVariant;
}): boolean {
  if (input.variant !== 'swimlane' || input.isVeryNarrow) return false;
  if (isSwimlaneNoteOrPolaroid(input.task) || isQuickAddChooserDraft(input.task)) return false;
  return (
    (input.swimlaneCardFields?.showStatus ?? true) ||
    (input.swimlaneCardFields?.showSeverity ?? true) ||
    (input.swimlaneCardFields?.showEstimates ?? true)
  );
}

function resolveSwimlaneStoryPointsForDisplay(
  task: Task,
  displayDuration: number | undefined
): number | undefined {
  if (isSwimlaneNoteOrPolaroid(task)) {
    return undefined;
  }
  if (task.isLocalTask && displayDuration != null) {
    return timeslotsToStoryPoints(displayDuration);
  }
  return task.storyPoints;
}

interface TaskCardSwimlaneMetaRowProps {
  assigneeTextSize: string;
  displayDuration: number | undefined;
  hideTestPoints: boolean;
  isQATask: boolean;
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
  task: Task;
}

export function TaskCardSwimlaneMetaRow({
  assigneeTextSize,
  displayDuration,
  hideTestPoints,
  isQATask,
  swimlaneCardFields,
  task,
}: TaskCardSwimlaneMetaRowProps) {
  const swimlaneStoryPointsForDisplay = resolveSwimlaneStoryPointsForDisplay(task, displayDuration);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      {(swimlaneCardFields?.showStatus ?? true) && (
        <StatusTag
          className="text-[10px] px-1 py-0.5"
          status={task.originalStatus}
          statusColorKey={task.statusColorKey}
        />
      )}
      {(swimlaneCardFields?.showSeverity ?? true) && task.incidentSeverity && (
        <span
          className={`text-[10px] font-bold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${getIncidentSeverityTagClasses(task.incidentSeverity)}`}
          title={`Критичность: ${task.incidentSeverity}`}
        >
          {task.incidentSeverity}
        </span>
      )}
      {(swimlaneCardFields?.showEstimates ?? true) && !isSwimlaneNoteOrPolaroid(task) && (
        <span className={`${assigneeTextSize} text-gray-600 dark:text-gray-300`}>
          {isQATask && !hideTestPoints
            ? formatTaskTestPointsForDisplay(task, 'compact')
            : formatTaskStoryPointsForDisplay(
                { storyPoints: swimlaneStoryPointsForDisplay },
                'compact'
              )}
        </span>
      )}
    </div>
  );
}
