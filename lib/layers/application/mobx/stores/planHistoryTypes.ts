import type { Comment, TaskParent, TaskPosition } from '@/types';

/** Layout/parent fields of a sticky note needed to restore a move. */
export type CommentHistorySlice = Pick<
  Comment,
  'assigneeId' | 'day' | 'height' | 'parent' | 'part' | 'width' | 'x' | 'y'
>;

interface TaskParentHistoryEntry {
  after: TaskParent | null;
  before: TaskParent | null;
}

interface CommentHistoryEntry {
  after: CommentHistorySlice;
  before: CommentHistorySlice;
}

export interface PlanHistorySideEffects {
  comments?: Map<string, CommentHistoryEntry>;
  taskParents?: Map<string, TaskParentHistoryEntry>;
}

export type PositionHistoryValue = TaskPosition | null;

export interface PlanHistoryStep {
  after: Map<string, PositionHistoryValue>;
  before: Map<string, PositionHistoryValue>;
  comments?: Map<string, CommentHistoryEntry>;
  taskParents?: Map<string, TaskParentHistoryEntry>;
}

/** Одна сохранённая позиция после шага undo/redo — для сведения задач и оценок с трекером. */
export interface PlanHistoryAppliedSave {
  devTaskKey?: string;
  isQa: boolean;
  position: TaskPosition;
}

export interface PlanHistoryAppliedPayload {
  comments?: Map<string, CommentHistorySlice>;
  saves: PlanHistoryAppliedSave[];
  taskParents?: Map<string, TaskParent | null>;
}

export interface PositionHistoryOptions {
  recordHistory?: boolean;
  sideEffects?: PlanHistorySideEffects;
}

export function commentHistorySliceFromComment(comment: Comment): CommentHistorySlice {
  return {
    assigneeId: comment.assigneeId,
    day: comment.day,
    height: comment.height,
    parent: comment.parent,
    part: comment.part,
    width: comment.width,
    x: comment.x,
    y: comment.y,
  };
}

export function commentHistorySlicesEqual(
  a: CommentHistorySlice,
  b: CommentHistorySlice
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function taskParentsEqual(a: TaskParent | null, b: TaskParent | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function taskParentEntriesHaveChange(
  taskParents: Map<string, TaskParentHistoryEntry> | undefined
): boolean {
  if (!taskParents) {
    return false;
  }
  for (const entry of taskParents.values()) {
    if (!taskParentsEqual(entry.before, entry.after)) {
      return true;
    }
  }
  return false;
}

function commentEntriesHaveChange(
  comments: Map<string, CommentHistoryEntry> | undefined
): boolean {
  if (!comments) {
    return false;
  }
  for (const entry of comments.values()) {
    if (!commentHistorySlicesEqual(entry.before, entry.after)) {
      return true;
    }
  }
  return false;
}

export function planHistorySideEffectsHaveChange(sideEffects?: PlanHistorySideEffects): boolean {
  if (!sideEffects) {
    return false;
  }
  return (
    taskParentEntriesHaveChange(sideEffects.taskParents) ||
    commentEntriesHaveChange(sideEffects.comments)
  );
}

export function resolveAppliedTaskParents(
  step: PlanHistoryStep,
  direction: 'after' | 'before'
): Map<string, TaskParent | null> | undefined {
  if (!step.taskParents || step.taskParents.size === 0) {
    return undefined;
  }
  const next = new Map<string, TaskParent | null>();
  step.taskParents.forEach((entry, taskId) => {
    next.set(taskId, direction === 'before' ? entry.before : entry.after);
  });
  return next;
}

export function resolveAppliedComments(
  step: PlanHistoryStep,
  direction: 'after' | 'before'
): Map<string, CommentHistorySlice> | undefined {
  if (!step.comments || step.comments.size === 0) {
    return undefined;
  }
  const next = new Map<string, CommentHistorySlice>();
  step.comments.forEach((entry, commentId) => {
    next.set(commentId, direction === 'before' ? entry.before : entry.after);
  });
  return next;
}
