import type { Comment, Task, TaskParent, TaskPosition } from '@/types';

import { playStickyNoteSaveMotion } from '@/features/comments/utils/stickyNoteSaveMotion';
import { createIdKeepingStickyNoteTilt } from '@/features/comments/utils/stickyNoteTilt';
import {
  commentSizeFromDraftPosition,
  parseSwimlaneCommentTaskId,
  toSwimlaneCommentTaskId,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { resolveAnnotationPersistFromLaneDraft } from '@/features/swimlane/utils/featureSwimlaneRows';
import { parseStickyNoteColor, type StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { findQuickAddDraftTask, removeQuickAddDraft } from './quickAddLocalDraft';

export interface DraftCommentCardRowUi {
  stickyNoteCardRowPreview: { layerShiftUp: number; span: number; taskId: string } | null;
  clearStickyNoteCardRowOverride: (taskId: string) => void;
  clearStickyNoteCardRowPreview: () => void;
  getStickyNoteCardRowOverride: (
    taskId: string
  ) => { layerShiftUp: number; span: number } | undefined;
  setStickyNoteCardRowOverride?: (
    taskId: string,
    layout: { layerShiftUp: number; span: number }
  ) => void;
}

export function peekDraftCommentCardRowLayout(
  taskId: string,
  ui: DraftCommentCardRowUi
): { layerShiftUp: number; span: number } | undefined {
  const preview = ui.stickyNoteCardRowPreview;
  return preview?.taskId === taskId ? preview : ui.getStickyNoteCardRowOverride(taskId);
}

export function consumeDraftCommentCardRowLayout(
  taskId: string,
  ui: DraftCommentCardRowUi
): { layerShiftUp: number; span: number } | undefined {
  const layout = peekDraftCommentCardRowLayout(taskId, ui);
  ui.clearStickyNoteCardRowOverride(taskId);
  if (ui.stickyNoteCardRowPreview?.taskId === taskId) {
    ui.clearStickyNoteCardRowPreview();
  }
  return layout;
}

interface SubmitQuickAddCommentDraftInput {
  cardRowLayout?: { layerShiftUp: number; span: number } | null;
  color?: StickyNoteColor;
  comments: Comment[];
  defaultNote: string;
  draftTitle?: string;
  persistAssigneeId?: string;
  persistParent?: TaskParent | null;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  closeNoteComposer: () => void;
  onCommentCreate: (comment: Comment) => void;
  onCommentUpdate: (commentId: string, text: string, color?: StickyNoteColor) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

type SubmitQuickAddCommentDraftResult = 'created' | 'noop' | 'unchanged' | 'updated';

function resolveCommentText(
  draftTitle: string | undefined,
  fallbackText: string | undefined,
  defaultNote: string
): string {
  return draftTitle?.trim() || fallbackText?.trim() || defaultNote;
}

function updateSavedSwimlaneComment(
  input: SubmitQuickAddCommentDraftInput,
  commentId: string
): 'unchanged' | 'updated' {
  const savedComment = input.comments.find((comment) => comment.id === commentId);
  const text = resolveCommentText(input.draftTitle, savedComment?.text, input.defaultNote);
  const color = parseStickyNoteColor(input.color ?? savedComment?.color);
  input.onCommentUpdate(commentId, text, color);
  input.closeNoteComposer();
  const changed =
    savedComment == null || savedComment.text !== text || parseStickyNoteColor(savedComment.color) !== color;
  return changed ? 'updated' : 'unchanged';
}

function createSwimlaneCommentFromDraft(input: SubmitQuickAddCommentDraftInput): 'created' | 'noop' {
  const draftTask = findQuickAddDraftTask(input);
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftTask || !draftPosition) {
    return 'noop';
  }
  const text = input.draftTitle?.trim() || draftTask.name?.trim();
  if (!text) {
    return 'noop';
  }
  const newId = createIdKeepingStickyNoteTilt(input.taskId, toSwimlaneCommentTaskId);
  const { height, width, y } = commentSizeFromDraftPosition(
    draftPosition.duration,
    input.cardRowLayout
  );
  const persist = resolveAnnotationPersistFromLaneDraft(draftTask, draftPosition.assignee);
  const assigneeId = input.persistAssigneeId ?? persist.assigneeId;
  const parent =
    input.persistParent !== undefined ? input.persistParent ?? undefined : persist.parent;
  playStickyNoteSaveMotion(toSwimlaneCommentTaskId(newId), 'stick');
  input.onCommentCreate({
    id: newId,
    clientInstanceId: newId,
    text,
    color: parseStickyNoteColor(input.color ?? draftTask.stickyNoteColor),
    assigneeId,
    day: draftPosition.startDay,
    part: draftPosition.startPart,
    x: 0,
    y,
    width,
    height,
    ...(parent ? { parent } : {}),
  });
  removeQuickAddDraft(input);
  return 'created';
}

/** Сохраняет текст и цвет заметки из quick-add попапа. */
export function submitQuickAddCommentDraft(
  input: SubmitQuickAddCommentDraftInput
): SubmitQuickAddCommentDraftResult {
  const savedCommentId = parseSwimlaneCommentTaskId(input.taskId);
  if (savedCommentId) {
    return updateSavedSwimlaneComment(input, savedCommentId);
  }
  return createSwimlaneCommentFromDraft(input);
}

interface CompleteQuickAddCommentDraftInput extends SubmitQuickAddCommentDraftInput {
  cardRowUi?: DraftCommentCardRowUi;
}

/** Сохраняет заметку; правка отзывается «прижатием» листа (новая заметка «приклеивается» сама). */
export function completeQuickAddCommentDraft(input: CompleteQuickAddCommentDraftInput): void {
  const cardRowLayout =
    input.cardRowLayout ??
    (input.cardRowUi ? consumeDraftCommentCardRowLayout(input.taskId, input.cardRowUi) : null);
  const result = submitQuickAddCommentDraft({ ...input, cardRowLayout });
  if (result === 'updated') {
    playStickyNoteSaveMotion(input.taskId, 'press');
  }
}
