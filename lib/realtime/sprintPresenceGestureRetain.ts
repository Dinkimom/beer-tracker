import type { SprintPresenceGestureCardRow } from './sprintRealtimeTypes';
import type { PhaseSegment } from '@/types';

import { getPartsPerDay } from '@/constants';

function cardRowsMatch(
  left: { layerShiftUp: number; span: number } | undefined,
  right: SprintPresenceGestureCardRow
): boolean {
  return left?.layerShiftUp === right.layerShiftUp && left.span === right.span;
}

interface PersistedPositionForResizeLatch {
  duration: number;
  segments?: PhaseSegment[] | null;
  startDay: number;
  startPart: number;
}

function orderedPlanSegments(segments: PhaseSegment[]): PhaseSegment[] {
  return [...segments].sort((a, b) => segmentStartCell(a) - segmentStartCell(b));
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
  /** Индекс отрезка: превью duration/startCell относятся к нему, не к envelope позиции. */
  planSegmentIndex?: number;
  startCell: number | null;
  taskId: string;
}

function segmentStartCell(segment: { startDay: number; startPart: number }): number {
  return segment.startDay * getPartsPerDay() + segment.startPart;
}

function persistedSegmentMatchesPreview(
  persisted: PersistedPositionForResizeLatch,
  preview: PresencePositionPreviewLatch
): boolean {
  if (preview.planSegmentIndex == null || !persisted.segments?.length) {
    return false;
  }
  const ordered = orderedPlanSegments(persisted.segments);
  const segment = ordered[preview.planSegmentIndex];
  // Индекс пропал после merge — позиция уже закоммичена, latch отпускаем.
  if (!segment) {
    return true;
  }
  const startMatches =
    preview.startCell == null || segmentStartCell(segment) === preview.startCell;
  if (segment.duration === preview.duration && startMatches) {
    return true;
  }
  // Дотянули до соседа → merge в один отрезок длиннее превью сегмента.
  // Иначе stale preview с planSegmentIndex снова ужмёт envelope.
  if (ordered.length === 1 && persisted.duration !== preview.duration) {
    return true;
  }
  return false;
}

function persistedEnvelopeMatchesPreview(
  persisted: PersistedPositionForResizeLatch,
  preview: PresencePositionPreviewLatch
): boolean {
  if (persisted.duration !== preview.duration) {
    return false;
  }
  if (preview.startCell == null) {
    return true;
  }
  return segmentStartCell(persisted) === preview.startCell;
}

function persistedPositionMatchesPreview(
  persisted: PersistedPositionForResizeLatch | undefined,
  preview: PresencePositionPreviewLatch
): boolean {
  if (!persisted) {
    return false;
  }
  if (preview.planSegmentIndex != null) {
    return persistedSegmentMatchesPreview(persisted, preview);
  }
  return persistedEnvelopeMatchesPreview(persisted, preview);
}

export function persistedPositionForPreviewLatch(
  live: PresencePositionPreviewLatch | null,
  previous: PresencePositionPreviewLatch | null,
  positions: ReadonlyMap<string, PersistedPositionForResizeLatch>
): PersistedPositionForResizeLatch | undefined {
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
  persisted: PersistedPositionForResizeLatch | undefined;
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
  persisted: PersistedPositionForResizeLatch | undefined
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
    left.assignee === right.assignee &&
    left.planSegmentIndex === right.planSegmentIndex
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
