import type { Comment, Task, TaskPosition } from '@/types';

import {
  commentSizeFromDraftPosition,
  DEFAULT_COMMENT_CARD_ROW_HEIGHT,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { resolveAnnotationPersistFromLaneDraft } from '@/features/swimlane/utils/featureSwimlaneRows';
import { compressPlannerImageFile } from '@/features/task/utils/compressPlannerImageFile';
import { fileFromPlannerImageObjectUrl, revokeLocalPlannerImageObjectUrl } from '@/features/task/utils/localPlannerImageFile';
import { toSwimlaneImageTaskId } from '@/features/task/utils/swimlaneImageTask';

import {
  consumeDraftCommentCardRowLayout,
  peekDraftCommentCardRowLayout,
  type DraftCommentCardRowUi,
} from './submitQuickAddCommentDraft';

interface SubmitQuickAddImageDraftInput {
  caption?: string;
  cardRowLayout?: { layerShiftUp: number; span: number } | null;
  cardRowUi?: DraftCommentCardRowUi;
  imageUrl?: string;
  selectedSprintId: number | null;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  createImageComment?: (input: {
    assigneeId: string;
    caption: string;
    day: number;
    file: File;
    height: number;
    part: number;
    width: number;
  }) => Promise<Comment | null>;
  onCommentCreate?: (comment: Comment) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

type SubmitQuickAddImageDraftResult = 'created' | 'failed' | 'noop';

function buildLocalImageTask(draftTask: Task, imageId: string, imageUrl: string, caption: string): Task {
  return {
    ...draftTask,
    id: toSwimlaneImageTaskId(imageId),
    imageUrl,
    isLocalTask: undefined,
    link: '',
    localDraftKind: 'image',
    name: caption,
    storyPoints: 0,
    testPoints: 0,
  };
}

function removeDraft(input: SubmitQuickAddImageDraftInput): void {
  input.setTasks((prev) => prev.filter((task) => task.id !== input.taskId));
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    return next;
  }, { recordHistory: true });
}

function resolveImageDraftCardRowLayout(
  input: SubmitQuickAddImageDraftInput
): { layerShiftUp: number; span: number } {
  const layout =
    input.cardRowLayout ??
    (input.cardRowUi ? peekDraftCommentCardRowLayout(input.taskId, input.cardRowUi) : null);
  return layout ?? { layerShiftUp: 0, span: DEFAULT_COMMENT_CARD_ROW_HEIGHT };
}

function releaseImageDraftCardRowLayout(input: SubmitQuickAddImageDraftInput): void {
  if (!input.cardRowUi) {
    return;
  }
  consumeDraftCommentCardRowLayout(input.taskId, input.cardRowUi);
}

function commitLocalImageCard(
  input: SubmitQuickAddImageDraftInput,
  draftTask: Task,
  draftPosition: TaskPosition,
  imageUrl: string,
  caption: string,
  cardRowLayout: { layerShiftUp: number; span: number }
): 'created' {
  const imageId = crypto.randomUUID();
  const committed = buildLocalImageTask(draftTask, imageId, imageUrl, caption);
  input.setTasks((prev) => [...prev.filter((task) => task.id !== input.taskId), committed]);
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    next.set(committed.id, {
      ...draftPosition,
      taskId: committed.id,
    });
    return next;
  }, { recordHistory: true });
  input.cardRowUi?.setStickyNoteCardRowOverride?.(committed.id, cardRowLayout);
  releaseImageDraftCardRowLayout(input);
  return 'created';
}

async function persistImageComment(
  input: SubmitQuickAddImageDraftInput,
  draftTask: Task,
  draftPosition: TaskPosition,
  imageUrl: string,
  caption: string,
  cardRowLayout: { layerShiftUp: number; span: number }
): Promise<'created' | 'failed'> {
  if (!input.createImageComment || !input.onCommentCreate) {
    return 'failed';
  }
  try {
    const rawFile = await fileFromPlannerImageObjectUrl(imageUrl);
    if (!rawFile) {
      return 'failed';
    }
    const file = await compressPlannerImageFile(rawFile);
    const { height, width } = commentSizeFromDraftPosition(
      draftPosition.duration,
      cardRowLayout
    );
    const persist = resolveAnnotationPersistFromLaneDraft(draftTask, draftPosition.assignee);
    const created = await input.createImageComment({
      assigneeId: persist.assigneeId,
      caption,
      day: draftPosition.startDay,
      file,
      height,
      part: draftPosition.startPart,
      width,
    });
    if (!created) {
      return 'failed';
    }
    revokeLocalPlannerImageObjectUrl(imageUrl);
    input.onCommentCreate({
      ...created,
      clientInstanceId: created.id,
      kind: 'image',
      ...(persist.parent ? { parent: persist.parent } : {}),
    });
    removeDraft(input);
    return 'created';
  } catch {
    return 'failed';
  }
}

/** Коммитит фотокарточки: в спринте — comments + planner_files, иначе только стейт. */
export async function submitQuickAddImageDraft(
  input: SubmitQuickAddImageDraftInput
): Promise<SubmitQuickAddImageDraftResult> {
  const imageUrl = input.imageUrl?.trim();
  if (!imageUrl) {
    return 'noop';
  }
  const draftTask = input.tasks.find((task) => task.id === input.taskId && task.isLocalTask);
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftTask || !draftPosition) {
    return 'noop';
  }
  const caption = input.caption?.trim() ?? '';
  const cardRowLayout = resolveImageDraftCardRowLayout(input);
  if (input.selectedSprintId != null && input.createImageComment && input.onCommentCreate) {
    return await persistImageComment(input, draftTask, draftPosition, imageUrl, caption, cardRowLayout);
  }
  return commitLocalImageCard(input, draftTask, draftPosition, imageUrl, caption, cardRowLayout);
}

export function removeLocalImageTaskFromPlanner(input: {
  taskId: string;
  tasks: Task[];
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}): void {
  const existing = input.tasks.find((task) => task.id === input.taskId);
  revokeLocalPlannerImageObjectUrl(existing?.imageUrl);
  input.setTasks((prev) => prev.filter((task) => task.id !== input.taskId));
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    return next;
  }, { recordHistory: true });
}
