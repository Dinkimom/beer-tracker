import type { ChangelogEntry } from '@/types/tracker';

import { mapStatus } from '@/utils/statusMapper';

export interface PlanCaptureSegment {
  duration: number;
  startDay: number;
  startPart: number;
}

export interface PlanCaptureGeometry {
  assigneeId: string;
  duration: number;
  segments: PlanCaptureSegment[] | null;
  startDay: number;
  startPart: number;
}

interface WorkStatusChange {
  atMs: number;
  inWork: boolean;
}

type PlanAnchorDecision =
  | { anchoredAtMs: number; geometry: PlanCaptureGeometry; type: 'anchor' }
  | { geometry: PlanCaptureGeometry; type: 'draft' };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isWorkStatusKey(statusKey: string | null | undefined): boolean {
  return mapStatus(statusKey ?? '') === 'in-progress';
}

function readStatusKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const key = (value as { key?: unknown }).key;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

export function sprintWindowBounds(
  startRaw: string | null | undefined,
  endRaw: string | null | undefined
): { endMs: number; startMs: number } | null {
  if (!startRaw || !endRaw) return null;
  const startMs = Date.parse(startRaw);
  const endParsed = Date.parse(endRaw);
  if (!Number.isFinite(startMs) || !Number.isFinite(endParsed) || endParsed < startMs) {
    return null;
  }
  const endMs = DATE_ONLY.test(endRaw) ? endParsed + DAY_MS - 1 : endParsed;
  return { endMs, startMs };
}

/** Смены статуса в хронологическом порядке. inWork — рабочий статус планера. */
export function workStatusChangesFromChangelog(entries: ChangelogEntry[]): WorkStatusChange[] {
  const changes: WorkStatusChange[] = [];
  for (const entry of entries) {
    const statusField = entry.fields?.find((field) => field.field.id === 'status');
    if (!statusField) continue;
    const atMs = Date.parse(entry.updatedAt);
    if (!Number.isFinite(atMs)) continue;
    changes.push({
      atMs,
      inWork: isWorkStatusKey(readStatusKey(statusField.to)),
    });
  }
  changes.sort((a, b) => a.atMs - b.atMs);
  return changes;
}

/** Первый вход в работу внутри окна спринта. Уже рабочий статус на старте спринта не считается. */
export function findWorkStartInSprint(
  changes: WorkStatusChange[],
  sprintStartMs: number,
  sprintEndMs: number
): number | null {
  let inWork = false;
  let startedAt: number | null = null;
  for (const change of changes) {
    const entered = change.inWork && !inWork;
    if (
      entered &&
      startedAt == null &&
      change.atMs >= sprintStartMs &&
      change.atMs <= sprintEndMs
    ) {
      startedAt = change.atMs;
    }
    inWork = change.inWork;
  }
  return startedAt;
}

function geometryEqual(a: PlanCaptureGeometry, b: PlanCaptureGeometry): boolean {
  return (
    a.assigneeId === b.assigneeId &&
    a.duration === b.duration &&
    a.startDay === b.startDay &&
    a.startPart === b.startPart &&
    JSON.stringify(a.segments) === JSON.stringify(b.segments)
  );
}

function inWorkNow(changes: WorkStatusChange[], currentStatusKey: string | null): boolean {
  const last = changes.at(-1);
  if (last) return last.inWork;
  return isWorkStatusKey(currentStatusKey);
}

/**
 * Пока задача не в работе — перезаписываем черновик.
 * На первом входе в работу внутри спринта замораживаем уже сохранённый черновик
 * и не подменяем его текущей позицией.
 */
export function decidePlanAnchorWrite(input: {
  currentStatusKey: string | null;
  draft: PlanCaptureGeometry | null;
  hasAnchor: boolean;
  position: PlanCaptureGeometry;
  sprintEndMs: number;
  sprintStartMs: number;
  workStatusChanges: WorkStatusChange[];
}): PlanAnchorDecision | null {
  if (input.hasAnchor) return null;

  const startedAt = findWorkStartInSprint(
    input.workStatusChanges,
    input.sprintStartMs,
    input.sprintEndMs
  );
  if (startedAt != null) {
    if (!input.draft) return null;
    return { type: 'anchor', anchoredAtMs: startedAt, geometry: input.draft };
  }

  if (inWorkNow(input.workStatusChanges, input.currentStatusKey)) return null;
  if (input.draft && geometryEqual(input.draft, input.position)) return null;
  return { type: 'draft', geometry: input.position };
}
