import type { Comment, Task, TaskPosition } from '@/types';

import toast from 'react-hot-toast';

import { parseSwimlaneCommentTaskId, pairedCommentWidthAndCardRowHeight, toSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { resolveAnnotationPersistFromLaneDraft } from '@/features/swimlane/utils/featureSwimlaneRows';
import { createSprintDiagramComment } from '@/lib/api/sprints';
import { emptyExcalidrawCommentScene } from '@/lib/comments/excalidrawCommentPayload';
import {
  markPlannerDiagramEditorFresh,
  rememberPlannerDiagramScene,
} from '@/lib/comments/plannerDiagramPreviewStore';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';

interface SubmitQuickAddDiagramDraftInput {
  comments: Comment[];
  diagramName?: string;
  selectedSprintId: number | null;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  createDiagramComment?: (input: {
    assigneeId: string;
    day: number;
    height: number;
    name: string;
    part: number;
    width: number;
  }) => Promise<Comment | null>;
  onCommentCreate: (comment: Comment) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

type SubmitQuickAddDiagramDraftResult =
  | { commentId: string; type: 'created' }
  | { commentId: string; type: 'existing' }
  | { type: 'failed' }
  | { type: 'noop' };

function removeDraft(input: SubmitQuickAddDiagramDraftInput): void {
  input.setTasks((prev) => prev.filter((task) => task.id !== input.taskId));
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    return next;
  }, { recordHistory: true });
}

function createLocalDiagramComment(
  input: SubmitQuickAddDiagramDraftInput
): SubmitQuickAddDiagramDraftResult {
  const draftTask = input.tasks.find((task) => task.id === input.taskId && task.isLocalTask);
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftTask || !draftPosition) {
    return { type: 'noop' };
  }
  const newId = crypto.randomUUID();
  const name = input.diagramName ?? draftTask.name;
  const { height, width } = pairedCommentWidthAndCardRowHeight(draftPosition.duration);
  const persist = resolveAnnotationPersistFromLaneDraft(draftTask, draftPosition.assignee);
  input.onCommentCreate({
    id: newId,
    clientInstanceId: newId,
    text: name,
    color: parseStickyNoteColor(draftTask.stickyNoteColor),
    assigneeId: persist.assigneeId,
    day: draftPosition.startDay,
    part: draftPosition.startPart,
    x: 0,
    y: 0,
    width,
    height,
    kind: 'diagram',
    ...(persist.parent ? { parent: persist.parent } : {}),
  });
  removeDraft(input);
  return { commentId: newId, type: 'created' };
}

async function persistDiagramComment(
  input: SubmitQuickAddDiagramDraftInput,
  draftPosition: TaskPosition,
  name: string,
  sprintId: number
): Promise<SubmitQuickAddDiagramDraftResult> {
  const create =
    input.createDiagramComment ??
    ((fields) => createSprintDiagramComment(sprintId, fields));
  try {
    const draftTask = input.tasks.find((task) => task.id === input.taskId && task.isLocalTask);
    const persist = resolveAnnotationPersistFromLaneDraft(
      draftTask ?? { assignee: draftPosition.assignee },
      draftPosition.assignee
    );
    const { height, width } = pairedCommentWidthAndCardRowHeight(draftPosition.duration);
    const created = await create({
      assigneeId: persist.assigneeId,
      day: draftPosition.startDay,
      height,
      name,
      part: draftPosition.startPart,
      width,
    });
    if (!created) {
      return { type: 'failed' };
    }
    input.onCommentCreate({
      ...created,
      clientInstanceId: created.id,
      kind: 'diagram',
      ...(persist.parent ? { parent: persist.parent } : {}),
    });
    removeDraft(input);
    return { commentId: created.id, type: 'created' };
  } catch {
    return { type: 'failed' };
  }
}

/** Сохраняет пустую схему: в спринте — comments + S3, иначе только стейт. */
export async function submitQuickAddDiagramDraft(
  input: SubmitQuickAddDiagramDraftInput
): Promise<SubmitQuickAddDiagramDraftResult> {
  const savedCommentId = parseSwimlaneCommentTaskId(input.taskId);
  if (savedCommentId) {
    const saved = input.comments.find((comment) => comment.id === savedCommentId);
    if (!saved) {
      return { type: 'noop' };
    }
    return { commentId: savedCommentId, type: 'existing' };
  }
  const draftTask = input.tasks.find((task) => task.id === input.taskId && task.isLocalTask);
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftTask || !draftPosition) {
    return { type: 'noop' };
  }
  const name = (input.diagramName ?? draftTask.name).trim();
  if (input.selectedSprintId != null) {
    return await persistDiagramComment(input, draftPosition, name, input.selectedSprintId);
  }
  return createLocalDiagramComment(input);
}

interface CompleteQuickAddDiagramDraftInput extends SubmitQuickAddDiagramDraftInput {
  createdMessage: string;
  failedMessage: string;
  onDiagramEditorClose: () => void;
  onDiagramEditorOpen: (taskId: string) => void;
  setSubmittingTaskId?: (taskId: string | null) => void;
}

function resolveQuickAddDiagramName(input: CompleteQuickAddDiagramDraftInput): string {
  const draftTask = input.tasks.find((task) => task.id === input.taskId && task.isLocalTask);
  return (input.diagramName ?? draftTask?.name ?? '').trim();
}

function seedFreshDiagramEditorScene(commentId: string, name: string): void {
  rememberPlannerDiagramScene(commentId, {
    ...emptyExcalidrawCommentScene(),
    ...(name ? { name } : {}),
  });
  markPlannerDiagramEditorFresh(commentId);
}

/** Создаёт схему (если нужно), показывает toast и открывает редактор. */
export async function completeQuickAddDiagramDraft(
  input: CompleteQuickAddDiagramDraftInput
): Promise<void> {
  const diagramName = resolveQuickAddDiagramName(input);
  input.setSubmittingTaskId?.(input.taskId);
  try {
    const result = await submitQuickAddDiagramDraft(input);
    if (result.type === 'noop') {
      return;
    }
    if (result.type === 'failed') {
      toast.error(input.failedMessage);
      return;
    }
    if (result.type === 'created') {
      toast.success(input.createdMessage);
      seedFreshDiagramEditorScene(result.commentId, diagramName);
    }
    input.onDiagramEditorOpen(toSwimlaneCommentTaskId(result.commentId));
  } finally {
    input.setSubmittingTaskId?.(null);
  }
}
