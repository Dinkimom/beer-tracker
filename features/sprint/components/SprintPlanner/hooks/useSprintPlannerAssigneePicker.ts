import type { Comment, Developer, Task, TaskPosition } from '@/types';

import { useCallback, useState } from 'react';

import {
  applyPhaseAssigneeChange,
  applyQaEngineerQuickAddSelection,
} from './useSprintPlannerAssigneePickerHelpers';

export type AssigneePickerState =
  | {
      mode: 'phase';
      anchorRect: DOMRect;
      position: TaskPosition;
      task: Task;
      taskName: string;
    }
  | {
      mode: 'qaEngineerQuickAdd';
      anchorRect: DOMRect;
      devTask: Task;
      taskName: string;
    };

interface UseSprintPlannerAssigneePickerParams {
  developers: Developer[];
  filteredTaskPositions: Map<string, TaskPosition>;
  qaTaskManagement: {
    placeQATaskAtNearestFreeSlot: (
      qaTask: Task,
      updatedDev: Task,
      devTaskPosition: TaskPosition
    ) => boolean;
  };
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  syncAssignees: boolean;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devKey?: string,
    force?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
}

export function useSprintPlannerAssigneePicker({
  developers,
  filteredTaskPositions,
  qaTaskManagement,
  savePosition,
  setComments,
  setTasks,
  syncAssignees,
  taskPositions,
  tasks,
}: UseSprintPlannerAssigneePickerParams) {
  const [assigneePicker, setAssigneePicker] = useState<AssigneePickerState | null>(null);

  const handleOpenAssigneePicker = useCallback(
    (data: { anchorRect: DOMRect; position: TaskPosition; task: Task; taskName: string }) => {
      setAssigneePicker({ mode: 'phase', ...data });
    },
    []
  );

  const handleContextMenuAssigneeSelect = useCallback(
    (task: Task, assigneeId: string) => {
      const storedPosition = taskPositions.get(task.id);
      const position =
        storedPosition != null
          ? { ...storedPosition, assignee: task.assignee || storedPosition.assignee }
          : ({
              taskId: task.id,
              assignee: task.team === 'QA' ? (task.qaEngineer ?? '') : (task.assignee ?? ''),
              duration: 1,
              startDay: 0,
              startPart: 0,
            } as TaskPosition);
      applyPhaseAssigneeChange({
        assigneeId,
        developers,
        position,
        savePosition,
        setComments,
        setTasks,
        syncAssignees,
        task,
      });
    },
    [developers, savePosition, setComments, setTasks, syncAssignees, taskPositions]
  );

  const onRequestQaEngineerPicker = useCallback(
    (devTaskId: string, anchorRect: DOMRect) => {
      const devTask = tasks.find((t) => t.id === devTaskId);
      if (!devTask) return;
      setAssigneePicker({
        mode: 'qaEngineerQuickAdd',
        anchorRect,
        devTask: { ...devTask },
        taskName: devTask.name || 'Без названия',
      });
    },
    [tasks]
  );

  const handleAssigneeSelect = useCallback(
    (assigneeId: string) => {
      if (!assigneePicker) return;

      if (assigneePicker.mode === 'qaEngineerQuickAdd') {
        applyQaEngineerQuickAddSelection({
          assigneeId,
          assigneePicker,
          developers,
          filteredTaskPositions,
          placeQATaskAtNearestFreeSlot: qaTaskManagement.placeQATaskAtNearestFreeSlot,
          setAssigneePicker,
          setTasks,
          taskPositions,
          tasks,
        });
        return;
      }

      applyPhaseAssigneeChange({
        assigneeId,
        developers,
        position: assigneePicker.position,
        savePosition,
        setComments,
        setTasks,
        syncAssignees,
        task: assigneePicker.task,
      });
      setAssigneePicker(null);
    },
    [
      assigneePicker,
      developers,
      filteredTaskPositions,
      qaTaskManagement,
      savePosition,
      setComments,
      setTasks,
      syncAssignees,
      taskPositions,
      tasks,
    ]
  );

  return {
    assigneePicker,
    setAssigneePicker,
    handleAssigneeSelect,
    handleContextMenuAssigneeSelect,
    handleOpenAssigneePicker,
    onRequestQaEngineerPicker,
  };
}
