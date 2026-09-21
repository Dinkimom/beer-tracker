/**
 * Проекция sprint Comment → Task + TaskPosition для рендера в свимлейне
 * (тот же TaskLayer / drag / resize, что у обычных задач).
 */

import type { Comment, Task, TaskPosition } from '@/types';

import {
  DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT,
  MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT,
  pairedPlannerCommentWidthAndCardRowHeight,
  plannerCommentCardRowHeightFromDurationParts,
  plannerCommentCardRowHeightFromWidth,
  plannerCommentDurationPartsFromWidth,
} from '@/lib/comments/plannerCommentCardRow';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';

const SWIMLANE_COMMENT_TASK_ID_PREFIX = 'comment:' as const;

/** Дефолтный вертикальный span при создании (совпадает с дефолтной длительностью 2 части). */
export const DEFAULT_COMMENT_CARD_ROW_HEIGHT = DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT;

const commentDurationPartsFromWidth = plannerCommentDurationPartsFromWidth;
export const commentCardRowHeightFromDurationParts = plannerCommentCardRowHeightFromDurationParts;
export const commentCardRowHeightFromWidth = plannerCommentCardRowHeightFromWidth;
export const pairedCommentWidthAndCardRowHeight = pairedPlannerCommentWidthAndCardRowHeight;

interface SwimlaneAnnotationLayerVisibility {
  imagesVisible: boolean;
  notesVisible: boolean;
}

function isPlannerCommentVisibleOnLayers(
  comment: Pick<Comment, 'kind'>,
  layers: SwimlaneAnnotationLayerVisibility
): boolean {
  return comment.kind === 'image' ? layers.imagesVisible : layers.notesVisible;
}

export function filterPlannerCommentsByLayers(
  comments: readonly Comment[],
  layers: SwimlaneAnnotationLayerVisibility
): Comment[] {
  if (layers.notesVisible && layers.imagesVisible) {
    return [...comments];
  }
  if (!layers.notesVisible && !layers.imagesVisible) {
    return [];
  }
  return comments.filter((comment) => isPlannerCommentVisibleOnLayers(comment, layers));
}

/** Черновик или сохранённая аннотация, скрытая выключателем слоя. */
export function isPlannerAnnotationVisibleOnLayers(
  task: Pick<Task, 'id' | 'localDraftKind'>,
  layers: SwimlaneAnnotationLayerVisibility
): boolean {
  if (task.localDraftKind === 'image') {
    return layers.imagesVisible;
  }
  if (task.localDraftKind === 'comment' || task.localDraftKind === 'diagram') {
    return layers.notesVisible;
  }
  return true;
}

export function toSwimlaneCommentTaskId(commentId: string): string {
  return `${SWIMLANE_COMMENT_TASK_ID_PREFIX}${commentId}`;
}

export function parseSwimlaneCommentTaskId(taskId: string): string | null {
  if (!taskId.startsWith(SWIMLANE_COMMENT_TASK_ID_PREFIX)) {
    return null;
  }
  const id = taskId.slice(SWIMLANE_COMMENT_TASK_ID_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function isSwimlaneCommentTaskId(taskId: string): boolean {
  return parseSwimlaneCommentTaskId(taskId) != null;
}

export function isSwimlaneCommentTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  if (task.localDraftKind === 'image' || task.localDraftKind === 'diagram') {
    return false;
  }
  return task.localDraftKind === 'comment' || isSwimlaneCommentTaskId(task.id);
}

/** Сохранённая заметка на свимлейне (`comment:id`), не quick-add черновик, не фото и не схема. */
export function isSavedSwimlaneCommentTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return (
    isSwimlaneCommentTaskId(task.id) &&
    task.localDraftKind !== 'image' &&
    task.localDraftKind !== 'diagram'
  );
}

/** Сохранённая фотокарточка (`comment:id` с kind=image). */
export function isSavedSwimlaneImageCommentTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return isSwimlaneCommentTaskId(task.id) && task.localDraftKind === 'image';
}

/** Черновик или сохранённая схема Excalidraw. */
export function isSwimlaneDiagramTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return task.localDraftKind === 'diagram';
}

/** Сохранённая схема на свимлейне (`comment:id`). */
export function isSavedSwimlaneDiagramTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return isSwimlaneCommentTaskId(task.id) && task.localDraftKind === 'diagram';
}

export function resolveSwimlaneAnnotationContextMenuVariant(
  task: Pick<Task, 'id' | 'localDraftKind'>
): 'diagram' | 'image' | 'note' | null {
  if (isSavedSwimlaneImageCommentTask(task)) {
    return 'image';
  }
  if (isSavedSwimlaneDiagramTask(task)) {
    return 'diagram';
  }
  if (isSavedSwimlaneCommentTask(task)) {
    return 'note';
  }
  return null;
}

/** Длительность заметки в частях таймлайна. width: либо parts, либо legacy px. */
export function commentDurationParts(comment: Comment): number {
  return commentDurationPartsFromWidth(Number(comment.width));
}

/** Вертикальный span заметки/фото в строках карточки свимлейна. */
export function commentCardRowSpan(comment: Pick<Comment, 'height'>): number {
  const height = Number(comment.height);
  if (!Number.isFinite(height) || height <= 0) {
    return 1;
  }
  if (height <= MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT) {
    return Math.max(1, Math.round(height));
  }
  return 1;
}

/** layoutShiftUp хранится в position_y (comments.position_y). */
export function commentCardRowLayout(comment: Pick<Comment, 'height' | 'y'>): {
  layerShiftUp: number;
  span: number;
} {
  const span = commentCardRowSpan(comment);
  const shift = Number(comment.y);
  const layerShiftUp =
    Number.isFinite(shift) && shift > 0
      ? Math.max(0, Math.min(span - 1, Math.round(shift)))
      : 0;
  return { layerShiftUp, span };
}

export function buildCommentCardRowById(comments: readonly Comment[]): Map<
  string,
  { layerShiftUp: number; span: number }
> {
  const map = new Map<string, { layerShiftUp: number; span: number }>();
  for (const comment of comments) {
    map.set(toSwimlaneCommentTaskId(comment.id), commentCardRowLayout(comment));
  }
  return map;
}

export function commentCardRowLayoutToPersistPatch(layout: {
  layerShiftUp: number;
  span: number;
}): { height: number; y: number } {
  return {
    height: Math.max(1, layout.span),
    y: Math.max(0, layout.layerShiftUp),
  };
}

/** Ширина из duration; высота и y — из вертикального layout, не 1:1 с шириной. */
export function commentSizeFromDraftPosition(
  durationParts: number,
  cardRowLayout?: { layerShiftUp: number; span: number } | null
): { height: number; width: number; y: number } {
  const layout = commentCardRowLayout({
    height: cardRowLayout?.span ?? 1,
    y: cardRowLayout?.layerShiftUp ?? 0,
  });
  return {
    height: layout.span,
    width: Math.max(1, Math.round(durationParts)),
    y: layout.layerShiftUp,
  };
}

function commentLocalDraftKind(isImage: boolean, isDiagram: boolean): 'comment' | 'diagram' | 'image' {
  if (isImage) {
    return 'image';
  }
  if (isDiagram) {
    return 'diagram';
  }
  return 'comment';
}

export function selectPendingApprovalCommentIds(
  comments: readonly Pick<Comment, 'id' | 'pendingApproval'>[]
): string[] {
  return comments.filter((comment) => comment.pendingApproval === true).map((comment) => comment.id);
}

export function commentToSwimlaneTask(comment: Comment): Task {
  const authorName = comment.authorName?.trim();
  const isImage = comment.kind === 'image';
  const isDiagram = comment.kind === 'diagram';
  return {
    id: toSwimlaneCommentTaskId(comment.id),
    name: comment.text,
    link: '',
    // Не isLocalTask: иначе TaskBar считает это quick-add черновиком и
    // открывает попап, который «не закрывается» (в т.ч. после reload).
    localDraftKind: commentLocalDraftKind(isImage, isDiagram),
    ...(isDiagram && comment.diagramUrl ? { diagramSceneUrl: comment.diagramUrl } : {}),
    ...(isImage && comment.imageUrl ? { imageUrl: comment.imageUrl } : {}),
    ...(authorName ? { stickyNoteAuthorName: authorName } : {}),
    stickyNoteColor: parseStickyNoteColor(comment.color),
    ...(comment.parent ? { parent: comment.parent } : {}),
    assignee: comment.assigneeId,
    team: 'Back',
    status: 'todo',
    storyPoints: 0,
    ...(comment.pendingApproval === true ? { pendingApproval: true } : {}),
  };
}

export function commentToPersistedTaskPosition(comment: Comment, taskId: string): TaskPosition {
  const duration = commentDurationParts(comment);
  return {
    taskId,
    assignee: comment.rowAssigneeId ?? comment.assigneeId,
    startDay: comment.day,
    startPart: comment.part,
    duration,
    plannedStartDay: comment.day,
    plannedStartPart: comment.part,
    plannedDuration: duration,
  };
}

export function buildSwimlaneCommentProjection(comments: Comment[]): {
  positions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
} {
  const tasks: Task[] = [];
  const tasksMap = new Map<string, Task>();
  const positions = new Map<string, TaskPosition>();
  for (const comment of comments) {
    const task = commentToSwimlaneTask(comment);
    const position = commentToPersistedTaskPosition(comment, task.id);
    tasks.push(task);
    tasksMap.set(task.id, task);
    positions.set(task.id, position);
  }
  return { positions, tasks, tasksMap };
}

export function mergeSwimlaneCommentPositions(
  taskPositions: Map<string, TaskPosition>,
  commentPositions: Map<string, TaskPosition>
): Map<string, TaskPosition> {
  if (commentPositions.size === 0) {
    return taskPositions;
  }
  const merged = new Map(taskPositions);
  for (const [id, pos] of commentPositions) {
    merged.set(id, pos);
  }
  return merged;
}

export function mergeSwimlaneCommentTasksMap(
  tasksMap: Map<string, Task>,
  commentTasksMap: Map<string, Task>
): Map<string, Task> {
  if (commentTasksMap.size === 0) {
    return tasksMap;
  }
  const merged = new Map(tasksMap);
  for (const [id, task] of commentTasksMap) {
    merged.set(id, task);
  }
  return merged;
}

/** Убрать comment:* из карты перед записью в TaskPositionsStore. */
export function stripSwimlaneCommentPositions(
  positions: Map<string, TaskPosition>
): Map<string, TaskPosition> {
  const out = new Map<string, TaskPosition>();
  for (const [id, pos] of positions) {
    if (parseSwimlaneCommentTaskId(id) == null) {
      out.set(id, pos);
    }
  }
  return out;
}

export function swimlanePositionToCommentPatch(position: TaskPosition): {
  assigneeId: string;
  day: number;
  part: number;
  width: number;
} {
  return {
    assigneeId: position.assignee,
    day: position.startDay,
    part: position.startPart,
    width: Math.max(1, position.duration),
  };
}

/** Патч после горизонтального ресайза. Схемы: width и height 1:1; фото и заметки сохраняют свою высоту. */
export function swimlanePositionToCommentResizePatch(
  position: TaskPosition,
  comment: Pick<Comment, 'height' | 'kind'>
): {
  assigneeId: string;
  day: number;
  height: number;
  part: number;
  width: number;
} {
  const base = swimlanePositionToCommentPatch(position);
  if (comment.kind === 'diagram') {
    const { height, width } = pairedCommentWidthAndCardRowHeight(position.duration);
    return {
      assigneeId: base.assigneeId,
      day: base.day,
      height,
      part: base.part,
      width,
    };
  }
  return {
    assigneeId: base.assigneeId,
    day: base.day,
    height: commentCardRowSpan(comment),
    part: base.part,
    width: base.width,
  };
}
