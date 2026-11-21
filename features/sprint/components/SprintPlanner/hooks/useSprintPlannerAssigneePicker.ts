import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { Developer, Task, TaskPosition } from '@/types';

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
  /** Задачи и заметки — из модели доски в момент выбора. */
  board: SprintBoard;
  developers: Developer[];
  filteredTaskPositions: Map<string, TaskPosition>;
  qaTaskManagement: {
    placeQATaskAtNearestFreeSlot: (
      qaTask: Task,
      updatedDev: Task,
      devTaskPosition: TaskPosition
    ) => boolean;
  };
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  syncAssignees: boolean;
  taskPositions: Map<string, TaskPosition>;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devKey?: string,
    force?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
}

export function useSprintPlannerAssigneePicker({
  board,
  developers,
  filteredTaskPositions,
  qaTaskManagement,
  savePosition,
  setTasks,
  syncAssignees,
  taskPositions,
}: UseSprintPlannerAssigneePickerParams) {
  const [assigneePicker, setAssigneePicker] = useState<AssigneePickerState | null>(null);

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
        setComments: board.comments.setWithSave,
        setTasks,
        syncAssignees,
        task,
      });
    },
    [board, developers, savePosition, setTasks, syncAssignees, taskPositions]
  );

  const onRequestQaEngineerPicker = useCallback(
    (devTaskId: string, anchorRect: DOMRect) => {
      const devTask = board.tasks.find((t) => t.id === devTaskId);
      if (!devTask) return;
      setAssigneePicker({
        mode: 'qaEngineerQuickAdd',
        anchorRect,
        devTask: { ...devTask },
        taskName: devTask.name || 'Без названия',
      });
    },
    [board]
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
          tasks: board.tasks,
        });
        return;
      }

      applyPhaseAssigneeChange({
        assigneeId,
        developers,
        position: assigneePicker.position,
        savePosition,
        setComments: board.comments.setWithSave,
        setTasks,
        syncAssignees,
        task: assigneePicker.task,
      });
      setAssigneePicker(null);
    },
    [
      assigneePicker,
      board,
      developers,
      filteredTaskPositions,
      qaTaskManagement,
      savePosition,
      setTasks,
      syncAssignees,
      taskPositions,
    ]
  );

  return {
    assigneePicker,
    setAssigneePicker,
    handleAssigneeSelect,
    handleContextMenuAssigneeSelect,
    onRequestQaEngineerPicker,
  };
}
