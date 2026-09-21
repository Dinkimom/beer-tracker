import type { Comment, Developer, Task, TaskPosition } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { createQATasksMap } from '@/features/qa/utils/qaTaskUtils';

export function applyPhaseAssigneeChange(input: {
  assigneeId: string;
  developers: Developer[];
  position: TaskPosition;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devKey?: string,
    force?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
  setComments: Dispatch<SetStateAction<Comment[]>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  syncAssignees: boolean;
  task: Task;
}): void {
  const commentId = parseSwimlaneCommentTaskId(input.task.id);
  if (commentId) {
    input.setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, assigneeId: input.assigneeId } : comment
      )
    );
    return;
  }

  const updated = {
    ...input.position,
    assignee: input.assigneeId,
    __source: 'SprintPlanner.handleAssigneeSelect',
  } as TaskPosition & { __source: string };
  const isQa = input.task.team === 'QA';

  if (input.syncAssignees) {
    const assigneeName = input.developers.find((developer) => developer.id === input.assigneeId)?.name;
    input.setTasks((prev) =>
      prev.map((task) => {
        const targetId = isQa ? input.task.originalTaskId : input.task.id;
        if (task.id !== targetId) return task;
        const name = assigneeName ?? (isQa ? task.qaEngineerName : task.assigneeName);
        return isQa
          ? { ...task, qaEngineer: input.assigneeId, qaEngineerName: name }
          : { ...task, assignee: input.assigneeId, assigneeName: name };
      })
    );
  }

  input.savePosition(updated, isQa, isQa ? input.task.originalTaskId : undefined, true, {
    recordHistory: true,
  });
}

export function applyQaEngineerQuickAddSelection(input: {
  assigneeId: string;
  assigneePicker: {
    devTask: Task;
  };
  developers: Developer[];
  filteredTaskPositions: Map<string, TaskPosition>;
  placeQATaskAtNearestFreeSlot: (
    qaTask: Task,
    updatedDev: Task,
    devTaskPosition: TaskPosition
  ) => boolean;
  setAssigneePicker: (value: null) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
}): void {
  const assigneeName = input.developers.find((d) => d.id === input.assigneeId)?.name;
  const devTaskId = input.assigneePicker.devTask.id;
  const updatedDev = {
    ...input.assigneePicker.devTask,
    qaEngineer: input.assigneeId,
    qaEngineerName: assigneeName ?? input.assigneePicker.devTask.qaEngineerName,
  };

  const nextTasksForMap = input.tasks.some((t) => t.id === devTaskId)
    ? input.tasks.map((t) => (t.id === devTaskId ? updatedDev : t))
    : [...input.tasks, updatedDev];
  const qaMap = createQATasksMap(nextTasksForMap);
  const qaTask = qaMap.get(devTaskId);
  const devTaskPosition = input.filteredTaskPositions.get(devTaskId);

  if (!qaTask || !devTaskPosition || input.taskPositions.has(qaTask.id)) {
    input.setAssigneePicker(null);
    return;
  }

  const placed = input.placeQATaskAtNearestFreeSlot(qaTask, updatedDev, devTaskPosition);
  if (!placed) return;

  input.setTasks((prev) =>
    prev.map((t) =>
      t.id === devTaskId
        ? { ...t, qaEngineer: input.assigneeId, qaEngineerName: assigneeName ?? t.qaEngineerName }
        : t
    )
  );
  input.setAssigneePicker(null);
}
