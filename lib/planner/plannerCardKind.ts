/**
 * Единственный источник правды о том, что за карточка лежит на доске планера.
 *
 * Аннотации (заметки `kind=text`, фото `image`, схемы Excalidraw `diagram`, виджеты `widget`)
 * живут в таблице `comments` и проецируются на свимлейн как «задачи» с id `comment:{uuid}`
 * (см. `features/comments/utils/swimlaneCommentTaskBridge.ts`). Черновики quick-add —
 * `local-task-*` (тип в `localDraftKind`), локальные фото до загрузки — `local-image:*`.
 *
 * Правила (таблица в `plannerCardKind.test.ts`):
 * 1. Тип аннотации в `localDraftKind` (`comment` → note, `image`, `diagram`, `widget`) главнее id:
 *    так размечены и сохранённые `comment:*`, и черновики `local-task-*`.
 * 2. `local-image:*` без типа — фото.
 * 3. `comment:*` без типа аннотации (или с `task`/`existing`) — заметка: сохранённая строка
 *    `comments` никогда не бывает работой из Tracker.
 * 4. Всё остальное — `task` (в т.ч. quick-add черновик задачи и выбор типа без `localDraftKind`).
 *
 * Чистый модуль: без React/MobX, только `Task`-поля.
 */

import type { Task } from '@/types';

/** Board id сохранённой аннотации: `comment:{uuid}`. */
const PLANNER_COMMENT_TASK_ID_PREFIX = 'comment:';
/** Черновик quick-add (задача, заметка, фото, схема) до сохранения. */
export const PLANNER_QUICK_ADD_DRAFT_ID_PREFIX = 'local-task-';
/** Локальное фото до сохранения в `comments`. */
const PLANNER_LOCAL_IMAGE_TASK_ID_PREFIX = 'local-image:';

/** Сырой uuid строки `comments` (MCP/контекст отдают его без префикса). */
export const PLANNER_COMMENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PlannerCardKind = 'diagram' | 'image' | 'note' | 'task' | 'widget';

type PlannerCardKindInput = Pick<Task, 'id' | 'localDraftKind'>;

const DRAFT_KIND_TO_CARD_KIND: Record<NonNullable<Task['localDraftKind']>, PlannerCardKind | null> = {
  comment: 'note',
  diagram: 'diagram',
  existing: null,
  image: 'image',
  task: null,
  widget: 'widget',
};

export function toPlannerCommentTaskId(commentId: string): string {
  if (commentId.startsWith(PLANNER_COMMENT_TASK_ID_PREFIX)) {
    return commentId;
  }
  return `${PLANNER_COMMENT_TASK_ID_PREFIX}${commentId}`;
}

export function parsePlannerCommentTaskId(taskId: string): string | null {
  if (!taskId.startsWith(PLANNER_COMMENT_TASK_ID_PREFIX)) {
    return null;
  }
  const id = taskId.slice(PLANNER_COMMENT_TASK_ID_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function isPlannerCommentTaskId(taskId: string): boolean {
  return parsePlannerCommentTaskId(taskId) != null;
}

export function toPlannerLocalImageTaskId(imageId: string): string {
  return `${PLANNER_LOCAL_IMAGE_TASK_ID_PREFIX}${imageId}`;
}

export function parsePlannerLocalImageTaskId(taskId: string): string | null {
  if (!taskId.startsWith(PLANNER_LOCAL_IMAGE_TASK_ID_PREFIX)) {
    return null;
  }
  const id = taskId.slice(PLANNER_LOCAL_IMAGE_TASK_ID_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function isPlannerLocalImageTaskId(taskId: string): boolean {
  return parsePlannerLocalImageTaskId(taskId) != null;
}

export function isPlannerQuickAddDraftId(taskId: string): boolean {
  return taskId.startsWith(PLANNER_QUICK_ADD_DRAFT_ID_PREFIX);
}

/**
 * Id карточки, которой нет в Tracker и в `task_positions`: черновик, локальное фото или аннотация.
 * Такие id нельзя писать в позиции и в стрелки task↔task.
 */
export function isPlannerClientOnlyCardId(taskId: string): boolean {
  return (
    isPlannerQuickAddDraftId(taskId) ||
    taskId.startsWith(PLANNER_LOCAL_IMAGE_TASK_ID_PREFIX) ||
    taskId.startsWith(PLANNER_COMMENT_TASK_ID_PREFIX)
  );
}

export function resolvePlannerCardKind(task: PlannerCardKindInput): PlannerCardKind {
  const fromDraftKind = task.localDraftKind ? DRAFT_KIND_TO_CARD_KIND[task.localDraftKind] : null;
  if (fromDraftKind) {
    return fromDraftKind;
  }
  if (isPlannerLocalImageTaskId(task.id)) {
    return 'image';
  }
  if (isPlannerCommentTaskId(task.id)) {
    return 'note';
  }
  return 'task';
}

/** Заметка / фото / схема / виджет — сохранённые или черновик. */
export function isPlannerAnnotation(task: PlannerCardKindInput): boolean {
  return resolvePlannerCardKind(task) !== 'task';
}

/** Аннотация, уже сохранённая в `comments` (`comment:{uuid}`). */
export function isSavedPlannerAnnotation(task: PlannerCardKindInput): boolean {
  return isPlannerCommentTaskId(task.id);
}

/** Аннотация, которая живёт только на клиенте (quick-add черновик или `local-image:*`). */
export function isPlannerAnnotationDraft(task: PlannerCardKindInput): boolean {
  return isPlannerAnnotation(task) && !isSavedPlannerAnnotation(task);
}

/**
 * Не работа из Tracker: любая аннотация или любой клиентский черновик (`isLocalTask`,
 * в т.ч. черновик задачи до создания issue). Такие карточки не идут в канбан, бэклог,
 * сайдбар и подсчёт занятости.
 */
export function isPlannerNonTrackerCard(
  task: Pick<Task, 'id' | 'isLocalTask' | 'localDraftKind'>
): boolean {
  return task.isLocalTask === true || isPlannerAnnotation(task);
}
