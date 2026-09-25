import type { AssigneePickerState } from './hooks/useSprintPlannerAssigneePicker';
import type { SprintPlannerViewProps } from './SprintPlannerView';
import type { Developer, TaskPosition } from '@/types';

import { getDevelopersForTaskSorted } from '@/features/sprint/utils/getDevelopersForTask';

import { OccupancyAssigneePicker } from './occupancy/OccupancyAssigneePicker';

interface SprintPlannerAssigneePickerLayerProps {
  assigneePicker: AssigneePickerState;
  assigneePointsStats: SprintPlannerViewProps['assigneePointsStats'];
  availability: SprintPlannerViewProps['availability'];
  developers: Developer[];
  sprintStartDate: Date;
  onAssigneeSelect: (assigneeId: string) => void;
  onClose: () => void;
}

export function SprintPlannerAssigneePickerLayer({
  assigneePicker,
  assigneePointsStats,
  availability,
  developers,
  sprintStartDate,
  onAssigneeSelect,
  onClose,
}: SprintPlannerAssigneePickerLayerProps) {
  const pickerTask =
    assigneePicker.mode === 'qaEngineerQuickAdd'
      ? {
          ...assigneePicker.devTask,
          team: 'QA' as const,
          originalTaskId: assigneePicker.devTask.id,
        }
      : assigneePicker.task;

  const position: TaskPosition =
    assigneePicker.mode === 'phase'
      ? assigneePicker.position
      : {
          taskId: assigneePicker.devTask.id,
          assignee: '',
          duration: 1,
          startDay: 0,
          startPart: 0,
        };

  return (
    <OccupancyAssigneePicker
      anchorRect={assigneePicker.anchorRect}
      assigneePointsStats={assigneePointsStats}
      availability={availability}
      developers={getDevelopersForTaskSorted(developers, pickerTask)}
      position={position}
      sprintStartDate={sprintStartDate}
      task={pickerTask}
      onClose={onClose}
      onSelect={onAssigneeSelect}
    />
  );
}
