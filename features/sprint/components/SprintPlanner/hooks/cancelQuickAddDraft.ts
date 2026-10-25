import type { SwimlanePlacementTool } from '@/lib/layers';
import type { Task, TaskPosition } from '@/types';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { revokeLocalPlannerImageObjectUrl } from '@/features/task/utils/localPlannerImageFile';
import { isSwimlaneImageTaskId } from '@/features/task/utils/swimlaneImageTask';

import { removeQuickAddDraft } from './quickAddLocalDraft';
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
  removeQuickAddDraft(input);
  if (input.submittingTaskId === input.taskId) {
    input.setSubmittingTaskId?.(null);
  }
}

/** Инструменты тулбара, которые создают локальный черновик прямо на доске. */
type InlineDraftTool = 'comment' | 'diagram' | 'image';

function isInlineDraftTool(tool: SwimlanePlacementTool): tool is InlineDraftTool {
  return tool === 'comment' || tool === 'diagram' || tool === 'image';
}

/** Id несохранённого локального черновика нужного вида. */
export function findLocalCreateDraftId(tasks: Task[], kind: InlineDraftTool): string | undefined {
  return tasks.find((task) => task.isLocalTask === true && task.localDraftKind === kind)?.id;
}

/**
 * Ушли с инструмента заметки, фото или схемы — его черновик отменяется.
 * Фото и схема переживают уход один раз, если выставлен `keepInlineCardDraftRef` (флаг сбрасывается);
 * у заметки заодно сбрасывается превью редактирования.
 */
export function cancelLocalCreateDraftOnToolLeave(
  input: Omit<CancelQuickAddDraftInput, 'taskId'> & {
    keepInlineCardDraftRef?: { current: boolean };
    placementTool: SwimlanePlacementTool;
    previousTool: SwimlanePlacementTool;
  }
): void {
  const { placementTool, previousTool } = input;
  if (!isInlineDraftTool(previousTool) || placementTool === previousTool) {
    return;
  }
  if (previousTool !== 'comment' && input.keepInlineCardDraftRef?.current) {
    input.keepInlineCardDraftRef.current = false;
    return;
  }
  const taskId = findLocalCreateDraftId(input.tasks, previousTool);
  if (!taskId) {
    return;
  }
  cancelQuickAddDraft({
    ...input,
    clearNoteEditPreview: previousTool === 'comment' ? input.clearNoteEditPreview : undefined,
    taskId,
  });
}
