import type { Task } from '@/types';

import {
  isPlannerLocalImageTaskId,
  parsePlannerLocalImageTaskId,
  resolvePlannerCardKind,
  toPlannerLocalImageTaskId,
} from '@/lib/planner/plannerCardKind';

/** Локальное фото `local-image:*`; префикс — в `lib/planner/plannerCardKind`. */
export const toSwimlaneImageTaskId = toPlannerLocalImageTaskId;
export const parseSwimlaneImageTaskId = parsePlannerLocalImageTaskId;
export const isSwimlaneImageTaskId = isPlannerLocalImageTaskId;

/** Фотокарточка: сохранённая `comment:*` (kind=image), черновик или `local-image:*`. */
export function isSwimlaneImageTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return resolvePlannerCardKind(task) === 'image';
}
