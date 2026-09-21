import type { TrackerMetadataStatusDto } from './fetchTrackerOrgMetadata';
import type { TaskStatus } from '@/utils/statusMapper';

import { normalizeStatusKey } from '@/utils/statusColors';

import { TaskStatusCategorySchema } from './schema';

/**
 * Эвристика: ключ **типа** статуса трекера → категория планера.
 * Только по типу (done / inProgress / new), не по имени статуса — иначе
 * «готово к разработке» ложно попадёт в done из‑за подстроки «готов».
 * Дополняется вручную в админке (defaultsByTrackerStatusType / overrides).
 */
export function mapTrackerStatusTypeKeyToCategory(typeKey: string): TaskStatus | undefined {
  const k = typeKey.trim().toLowerCase().replace(/\s+/g, '');
  // Точные / типовые ключи Jira & Tracker status categories — без includes('готов') и т.п.
  if (
    k === 'new' ||
    k === 'todo' ||
    k === 'open' ||
    k === 'backlog' ||
    k === 'undefined' ||
    k.includes('start') ||
    k.includes('начал')
  ) {
    return 'todo';
  }
  if (
    k === 'indeterminate' ||
    k === 'inprogress' ||
    k.includes('progress') ||
    k.includes('review') ||
    k.includes('работе') ||
    k.includes('вработе')
  ) {
    return 'in-progress';
  }
  if (k.includes('pause') || k.includes('block') || k.includes('пауз')) {
    return 'paused';
  }
  if (
    k === 'done' ||
    k === 'closed' ||
    k === 'complete' ||
    k === 'completed' ||
    k === 'resolved'
  ) {
    return 'done';
  }
  return undefined;
}

/**
 * Палитра карточки по типу статуса трекера (когда нет visualToken override).
 * `done` → green (`closed`), `inProgress` → blue (`inprogress`).
 */
export function defaultPaletteKeyForTrackerStatusType(
  typeKey: string | undefined
): string | undefined {
  const raw = typeKey?.trim();
  if (!raw) {
    return undefined;
  }
  const cat = mapTrackerStatusTypeKeyToCategory(raw);
  switch (cat) {
    case 'todo':
      return 'backlog';
    case 'in-progress':
      return 'inprogress';
    case 'paused':
      return 'blocked';
    case 'done':
      return 'closed';
    default:
      return normalizeStatusKey(raw) || undefined;
  }
}

/** Порядок секций админки: типы статусов по категории, затем прочие. */
export function trackerStatusTypeSectionSortWeight(typeKey: string): number {
  const cat = mapTrackerStatusTypeKeyToCategory(typeKey);
  switch (cat) {
    case 'todo':
      return 0;
    case 'in-progress':
      return 1;
    case 'paused':
      return 2;
    case 'done':
      return 3;
    default:
      return 4;
  }
}

type StatusDefaultsByType = Record<string, TaskStatus>;

/**
 * Строит defaultsByTrackerStatusType по списку статусов API (по ключу **типа** статуса).
 * При нескольких статусах одного типа категория одна; при конфликте побеждает первый нетривиальный маппинг.
 */
function tryAssignStatusDefault(
  out: StatusDefaultsByType,
  status: TrackerMetadataStatusDto
): void {
  const typeKey = status.statusType?.key?.trim();
  if (!typeKey || out[typeKey]) {
    return;
  }
  const cat = mapTrackerStatusTypeKeyToCategory(typeKey);
  if (cat && TaskStatusCategorySchema.safeParse(cat).success) {
    out[typeKey] = cat;
  }
}

export function buildStatusDefaultsFromTrackerStatuses(
  statuses: TrackerMetadataStatusDto[]
): StatusDefaultsByType {
  const out: StatusDefaultsByType = {};
  for (const status of statuses) {
    tryAssignStatusDefault(out, status);
  }
  return out;
}
