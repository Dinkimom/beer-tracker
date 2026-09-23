import type { SprintPresenceGestureCardRow } from './sprintRealtimeTypes';

import { getPartsPerDay } from '@/constants';

function cardRowsMatch(
  left: { layerShiftUp: number; span: number } | undefined,
  right: SprintPresenceGestureCardRow
): boolean {
  return left?.layerShiftUp === right.layerShiftUp && left.span === right.span;
}

/**
 * После mouseup жест пропадает раньше, чем comments SSE.
 * Держим последний cardRow, пока сохранённая высота не догонит.
 */
export function retainRemotePresenceCardRows(
  live: ReadonlyMap<string, SprintPresenceGestureCardRow>,
  previous: ReadonlyMap<string, SprintPresenceGestureCardRow>,
  persisted: ReadonlyMap<string, { layerShiftUp: number; span: number }> | undefined
): Map<string, SprintPresenceGestureCardRow> {
  const next = new Map(live);
  for (const [taskId, layout] of previous) {
    if (next.has(taskId) || cardRowsMatch(persisted?.get(taskId), layout)) {
      continue;
    }
    next.set(taskId, layout);
  }
  return next;
}

export function presenceCardRowMapsEqual(
  left: ReadonlyMap<string, { layerShiftUp: number; span: number }>,
  right: ReadonlyMap<string, { layerShiftUp: number; span: number }>
): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [taskId, layout] of left) {
    if (!cardRowsMatch(right.get(taskId), layout)) {
      return false;
    }
  }
  return true;
}

export interface PresencePositionPreviewLatch {
  assignee?: string;
  duration: number;
  startCell: number | null;
  taskId: string;
}

function persistedPositionMatchesPreview(
  persisted: { duration: number; startDay: number; startPart: number } | undefined,
  preview: PresencePositionPreviewLatch
): boolean {
  if (!persisted || persisted.duration !== preview.duration) {
    return false;
  }
  if (preview.startCell == null) {
    return true;
  }
  return persisted.startDay * getPartsPerDay() + persisted.startPart === preview.startCell;
}

export function persistedPositionForPreviewLatch(
  live: PresencePositionPreviewLatch | null,
  previous: PresencePositionPreviewLatch | null,
  positions: ReadonlyMap<string, { duration: number; startDay: number; startPart: number }>
): { duration: number; startDay: number; startPart: number } | undefined {
  const taskId = live?.taskId ?? previous?.taskId;
  return taskId ? positions.get(taskId) : undefined;
}

/**
 * Локальный ресайз: после mouseup держим ширину, пока позиция не сохранится.
 * Escape увеличивает discardEpoch — тогда latch сбрасывается к сохранённому размеру.
 */
export function resolveRetainedLocalResizePreview(input: {
  discardEpoch: number;
  latched: PresencePositionPreviewLatch | null;
  latchedEpoch: number;
  live: PresencePositionPreviewLatch | null;
  persisted: { duration: number; startDay: number; startPart: number } | undefined;
}): { epoch: number; preview: PresencePositionPreviewLatch | null } {
  if (input.discardEpoch !== input.latchedEpoch) {
    return { epoch: input.discardEpoch, preview: null };
  }
  return {
    epoch: input.latchedEpoch,
    preview: retainPresencePositionPreview(input.live, input.latched, input.persisted),
  };
}

/** После mouseup жест/preview пропадают раньше, чем positions/comments. */
export function retainPresencePositionPreview(
  live: PresencePositionPreviewLatch | null,
  previous: PresencePositionPreviewLatch | null,
  persisted: { duration: number; startDay: number; startPart: number } | undefined
): PresencePositionPreviewLatch | null {
  if (live) {
    return live;
  }
  if (!previous || persistedPositionMatchesPreview(persisted, previous)) {
    return null;
  }
  return previous;
}

export function presencePositionPreviewEquals(
  left: PresencePositionPreviewLatch | null,
  right: PresencePositionPreviewLatch | null
): boolean {
  if (left == null || right == null) {
    return left === right;
  }
  return (
    left.taskId === right.taskId &&
    left.duration === right.duration &&
    left.startCell === right.startCell &&
    left.assignee === right.assignee
  );
}

export function retainPresenceOccupancyPreviews(
  live: ReadonlyMap<string, { duration: number; startDay: number; startPart: number }>,
  previous: ReadonlyMap<string, { duration: number; startDay: number; startPart: number }>,
  persisted: ReadonlyMap<string, { duration: number; startDay: number; startPart: number }>
): Map<string, { duration: number; startDay: number; startPart: number }> {
  const next = new Map(live);
  for (const [taskId, preview] of previous) {
    if (next.has(taskId)) {
      continue;
    }
    const saved = persisted.get(taskId);
    if (
      saved &&
      saved.duration === preview.duration &&
      saved.startDay === preview.startDay &&
      saved.startPart === preview.startPart
    ) {
      continue;
    }
    next.set(taskId, preview);
  }
  return next;
}

export function presenceOccupancyPreviewMapsEqual(
  left: ReadonlyMap<string, { duration: number; startDay: number; startPart: number }>,
  right: ReadonlyMap<string, { duration: number; startDay: number; startPart: number }>
): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [taskId, preview] of left) {
    const other = right.get(taskId);
    if (
      !other ||
      other.duration !== preview.duration ||
      other.startDay !== preview.startDay ||
      other.startPart !== preview.startPart
    ) {
      return false;
    }
  }
  return true;
}
