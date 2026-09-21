import type { SwimlaneNoteClipboard } from '@/lib/comments/swimlaneNoteClipboard';
import type { Comment, Task, TaskParent, TaskPosition } from '@/types';

import toast from 'react-hot-toast';

import { resolveAnnotationPersistFromLaneDraft } from '@/features/swimlane/utils/featureSwimlaneRows';

interface PasteQuickAddNoteDraftInput {
  clipboard: SwimlaneNoteClipboard;
  createdMessage: string;
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
  createdMessage: string;
  day: number;
  parent?: TaskParent;
  part: number;
  onCommentCreate: (comment: Comment) => void;
}): void {
  const newId = crypto.randomUUID();
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
  toast.success(input.createdMessage);
}

export function pasteQuickAddNoteDraft(input: PasteQuickAddNoteDraftInput): 'created' | 'noop' {
  const draftTask = input.tasks.find((task) => task.id === input.taskId && task.isLocalTask);
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftTask || !draftPosition) {
    return 'noop';
  }
  const persist = resolveAnnotationPersistFromLaneDraft(draftTask, draftPosition.assignee);
  pasteNoteAtSwimlaneCell({
    assigneeId: persist.assigneeId,
    clipboard: input.clipboard,
    createdMessage: input.createdMessage,
    day: draftPosition.startDay,
    onCommentCreate: input.onCommentCreate,
    parent: persist.parent,
    part: draftPosition.startPart,
  });
  input.setTasks((prev) => prev.filter((task) => task.id !== input.taskId));
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    return next;
  }, { recordHistory: true });
  return 'created';
}
