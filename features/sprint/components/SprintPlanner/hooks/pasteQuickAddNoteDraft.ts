import type { SwimlaneNoteClipboard } from '@/lib/comments/swimlaneNoteClipboard';
import type { Comment, Task, TaskParent, TaskPosition } from '@/types';

import { playStickyNoteSaveMotion } from '@/features/comments/utils/stickyNoteSaveMotion';
import { createIdKeepingStickyNoteTilt } from '@/features/comments/utils/stickyNoteTilt';
import { toSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { resolveAnnotationPersistFromLaneDraft } from '@/features/swimlane/utils/featureSwimlaneRows';

import { findQuickAddDraftTask, removeQuickAddDraft } from './quickAddLocalDraft';

interface PasteQuickAddNoteDraftInput {
  clipboard: SwimlaneNoteClipboard;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  onCommentCreate: (comment: Comment) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function pasteNoteAtSwimlaneCell(input: {
  assigneeId: string;
  clipboard: SwimlaneNoteClipboard;
  day: number;
  /** Черновик, на месте которого встаёт заметка: наклон листа сохраняется. */
  draftTaskId?: string;
  parent?: TaskParent;
  part: number;
  onCommentCreate: (comment: Comment) => void;
}): void {
  const newId = input.draftTaskId
    ? createIdKeepingStickyNoteTilt(input.draftTaskId, toSwimlaneCommentTaskId)
    : crypto.randomUUID();
  playStickyNoteSaveMotion(toSwimlaneCommentTaskId(newId), 'stick');
  input.onCommentCreate({
    id: newId,
    clientInstanceId: newId,
    text: input.clipboard.text,
    color: input.clipboard.color,
    assigneeId: input.assigneeId,
    day: input.day,
    part: input.part,
    skipMentionNotifications: true,
    x: 0,
    y: 0,
    width: input.clipboard.width,
    height: input.clipboard.height,
    ...(input.parent ? { parent: input.parent } : {}),
  });
}

export function pasteQuickAddNoteDraft(input: PasteQuickAddNoteDraftInput): 'created' | 'noop' {
  const draftTask = findQuickAddDraftTask(input);
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftTask || !draftPosition) {
    return 'noop';
  }
  const persist = resolveAnnotationPersistFromLaneDraft(draftTask, draftPosition.assignee);
  pasteNoteAtSwimlaneCell({
    assigneeId: persist.assigneeId,
    clipboard: input.clipboard,
    day: draftPosition.startDay,
    draftTaskId: input.taskId,
    onCommentCreate: input.onCommentCreate,
    parent: persist.parent,
    part: draftPosition.startPart,
  });
  removeQuickAddDraft(input);
  return 'created';
}
