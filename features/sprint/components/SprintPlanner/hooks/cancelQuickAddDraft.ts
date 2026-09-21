import type { SwimlanePlacementTool } from '@/lib/layers';
import type { Task, TaskPosition } from '@/types';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { revokeLocalPlannerImageObjectUrl } from '@/features/task/utils/localPlannerImageFile';
import { isSwimlaneImageTaskId } from '@/features/task/utils/swimlaneImageTask';

import { removeLocalImageTaskFromPlanner } from './submitQuickAddImageDraft';

interface CancelQuickAddDraftInput {
  submittingTaskId?: string | null;
  taskId: string;
  tasks: Task[];
  clearNoteEditPreview?: () => void;
  clearStickyNoteCardRowOverride?: (taskId: string) => void;
  closeNoteComposer: () => void;
  setSubmittingTaskId?: (taskId: string | null) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function cancelQuickAddDraft(input: CancelQuickAddDraftInput): void {
  input.clearNoteEditPreview?.();
  input.clearStickyNoteCardRowOverride?.(input.taskId);
  if (parseSwimlaneCommentTaskId(input.taskId) != null) {
    input.closeNoteComposer();
    return;
  }
  if (isSwimlaneImageTaskId(input.taskId)) {
    removeLocalImageTaskFromPlanner(input);
    return;
  }
  const draft = input.tasks.find((task) => task.id === input.taskId);
  revokeLocalPlannerImageObjectUrl(draft?.imageUrl);
  input.setTasks((prev) => prev.filter((task) => task.id !== input.taskId));
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    return next;
  }, { recordHistory: true });
  if (input.submittingTaskId === input.taskId) {
    input.setSubmittingTaskId?.(null);
  }
}

export function findLocalCommentCreateDraftId(tasks: Task[]): string | undefined {
  return tasks.find(
    (task) => task.isLocalTask === true && task.localDraftKind === 'comment'
  )?.id;
}

export function findLocalImageCreateDraftId(tasks: Task[]): string | undefined {
  return tasks.find(
    (task) => task.isLocalTask === true && task.localDraftKind === 'image'
  )?.id;
}

export function findLocalDiagramCreateDraftId(tasks: Task[]): string | undefined {
  return tasks.find(
    (task) => task.isLocalTask === true && task.localDraftKind === 'diagram'
  )?.id;
}

export function cancelLocalCommentCreateDraftIfLeftCommentTool(input: {
  previousTool: SwimlanePlacementTool;
  placementTool: SwimlanePlacementTool;
  tasks: Task[];
  clearNoteEditPreview?: () => void;
  clearStickyNoteCardRowOverride?: (taskId: string) => void;
  closeNoteComposer: () => void;
  setSubmittingTaskId?: (taskId: string | null) => void;
  setTaskPositions: CancelQuickAddDraftInput['setTaskPositions'];
  setTasks: CancelQuickAddDraftInput['setTasks'];
  submittingTaskId?: string | null;
}): void {
  if (input.previousTool !== 'comment' || input.placementTool === 'comment') {
    return;
  }
  const taskId = findLocalCommentCreateDraftId(input.tasks);
  if (!taskId) {
    return;
  }
  cancelQuickAddDraft({ ...input, taskId });
}

export function cancelLocalImageCreateDraftIfLeftImageTool(input: {
  previousTool: SwimlanePlacementTool;
  placementTool: SwimlanePlacementTool;
  tasks: Task[];
  clearStickyNoteCardRowOverride?: (taskId: string) => void;
  closeNoteComposer: () => void;
  setSubmittingTaskId?: (taskId: string | null) => void;
  setTaskPositions: CancelQuickAddDraftInput['setTaskPositions'];
  setTasks: CancelQuickAddDraftInput['setTasks'];
  submittingTaskId?: string | null;
}): void {
  if (input.previousTool !== 'image' || input.placementTool === 'image') {
    return;
  }
  const taskId = findLocalImageCreateDraftId(input.tasks);
  if (!taskId) {
    return;
  }
  cancelQuickAddDraft({ ...input, taskId });
}

export function cancelLocalDiagramCreateDraftIfLeftDiagramTool(input: {
  previousTool: SwimlanePlacementTool;
  placementTool: SwimlanePlacementTool;
  tasks: Task[];
  clearStickyNoteCardRowOverride?: (taskId: string) => void;
  closeNoteComposer: () => void;
  setSubmittingTaskId?: (taskId: string | null) => void;
  setTaskPositions: CancelQuickAddDraftInput['setTaskPositions'];
  setTasks: CancelQuickAddDraftInput['setTasks'];
  submittingTaskId?: string | null;
}): void {
  if (input.previousTool !== 'diagram' || input.placementTool === 'diagram') {
    return;
  }
  const taskId = findLocalDiagramCreateDraftId(input.tasks);
  if (!taskId) {
    return;
  }
  cancelQuickAddDraft({ ...input, taskId });
}
