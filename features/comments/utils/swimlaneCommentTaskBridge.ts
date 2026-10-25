/**
 * Проекция sprint Comment → Task + TaskPosition для рендера в свимлейне
 * (тот же TaskLayer / drag / resize, что у обычных задач).
 */

import type { Comment, Task, TaskPosition } from '@/types';

import {
  DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT,
  pairedPlannerCommentWidthAndCardRowHeight,
  plannerCommentCardRowHeightFromDurationParts,
  plannerCommentCardRowHeightFromWidth,
  plannerCommentCardRowSpan,
  plannerCommentDurationPartsFromWidth,
} from '@/lib/comments/plannerCommentCardRow';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';
import {
  isPlannerCommentTaskId,
  isSavedPlannerAnnotation,
  parsePlannerCommentTaskId,
  resolvePlannerCardKind,
  toPlannerCommentTaskId,
} from '@/lib/planner/plannerCardKind';

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
  if (task.localDraftKind === 'comment' || task.localDraftKind === 'diagram' || task.localDraftKind === 'widget') {
    return layers.notesVisible;
  }
  return true;
}

/** Id карточки аннотации на доске; префикс и разбор — в `lib/planner/plannerCardKind`. */
export const toSwimlaneCommentTaskId = toPlannerCommentTaskId;
export const parseSwimlaneCommentTaskId = parsePlannerCommentTaskId;
export const isSwimlaneCommentTaskId = isPlannerCommentTaskId;

/** Заметка (`kind=text`): сохранённая `comment:*` или черновик quick-add. Не фото/схема/виджет. */
export function isSwimlaneCommentTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return resolvePlannerCardKind(task) === 'note';
}

/** Черновик или сохранённая схема Excalidraw. */
export function isSwimlaneDiagramTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return resolvePlannerCardKind(task) === 'diagram';
}

/** Карточка-виджет (`kind=widget`). */
export function isSwimlaneWidgetTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return resolvePlannerCardKind(task) === 'widget';
}

export type SwimlaneAnnotationContextMenuVariant = 'diagram' | 'image' | 'note' | 'pending' | 'widget';

/**
 * Вариант меню для сохранённой аннотации; `null` — не аннотация или ещё черновик quick-add.
 * Черновик агента (`pendingApproval`) — отдельный вариант `pending` независимо от kind:
 * до решения пользователя его можно только принять или отклонить.
 */
export function resolveSwimlaneAnnotationContextMenuVariant(
  task: Pick<Task, 'id' | 'localDraftKind' | 'pendingApproval'>
): SwimlaneAnnotationContextMenuVariant | null {
  if (!isSavedPlannerAnnotation(task)) {
    return null;
  }
  if (task.pendingApproval === true) {
    return 'pending';
  }
  const kind = resolvePlannerCardKind(task);
  return kind === 'task' ? null : kind;
}

/** Длительность заметки в частях таймлайна. width: либо parts, либо legacy px. */
export function commentDurationParts(comment: Comment): number {
  return commentDurationPartsFromWidth(Number(comment.width));
}

/**
 * layoutShiftUp хранится в position_y (comments.position_y). Span — `plannerCommentCardRowSpan`
 * (схема 1:1 с шириной, остальные — сохранённый height 1..10).
 */
export function commentCardRowLayout(
  comment: Partial<Pick<Comment, 'kind' | 'width'>> & Pick<Comment, 'height' | 'y'>
): {
  layerShiftUp: number;
  span: number;
} {
  const span = plannerCommentCardRowSpan({
    height: Number(comment.height),
    kind: comment.kind ?? 'text',
    width: Number(comment.width ?? 0),
  });
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

function commentLocalDraftKind(
  isImage: boolean,
  isDiagram: boolean,
  isWidget: boolean
): 'comment' | 'diagram' | 'image' | 'widget' {
  if (isImage) {
    return 'image';
  }
  if (isDiagram) {
    return 'diagram';
  }
  if (isWidget) {
    return 'widget';
  }
  return 'comment';
}

export function selectPendingApprovalCommentIds(
  comments: readonly Pick<Comment, 'id' | 'pendingApproval'>[]
): string[] {
  return selectPendingAgentProposalNotes(comments).ids;
}

/** Pending MCP draft notes + first stamped client brand (for the agent toolbar). */
export function selectPendingAgentProposalNotes(
  comments: readonly Pick<Comment, 'clientBrand' | 'id' | 'pendingApproval'>[]
): { clientBrand?: Comment['clientBrand']; ids: string[] } {
  const ids: string[] = [];
  let clientBrand: Comment['clientBrand'];
  for (const comment of comments) {
    if (comment.pendingApproval !== true) {
      continue;
    }
    ids.push(comment.id);
    if (!clientBrand && comment.clientBrand) {
      clientBrand = comment.clientBrand;
    }
  }
  return clientBrand ? { clientBrand, ids } : { ids };
}

export function commentToSwimlaneTask(comment: Comment): Task {
  const authorName = comment.authorName?.trim();
  const isImage = comment.kind === 'image';
  const isDiagram = comment.kind === 'diagram';
  const isWidget = comment.kind === 'widget';
  return {
    id: toSwimlaneCommentTaskId(comment.id),
    name: comment.text,
    link: '',
    // Не isLocalTask: иначе TaskBar считает это quick-add черновиком и
    // открывает попап, который «не закрывается» (в т.ч. после reload).
    localDraftKind: commentLocalDraftKind(isImage, isDiagram, isWidget),
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
    ...(comment.clientBrand ? { pendingApprovalClientBrand: comment.clientBrand } : {}),
    ...(comment.pendingApproval === true && comment.replaceAction === 'delete' ? { pendingDelete: true } : {}),
    ...(comment.pendingApproval === true && comment.replacesCommentId
      ? { pendingReplacesTaskId: toSwimlaneCommentTaskId(comment.replacesCommentId) }
      : {}),
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
    height: plannerCommentCardRowSpan({
      height: Number(comment.height),
      kind: comment.kind ?? 'text',
      width: base.width,
    }),
    part: base.part,
    width: base.width,
  };
}
