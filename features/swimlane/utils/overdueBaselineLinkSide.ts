import type { PhaseSegment, Task, TaskPosition } from '@/types';
import type { RectLike } from '@/utils/nearestSideAnchors';

import { getPartsPerDay } from '@/constants';
import { getOrderedPlanSegments } from '@/lib/swimlane/swimlanePlanSegments';
import { resolveNearestSideAnchors } from '@/utils/nearestSideAnchors';

import { resolveSwimlaneOneCardHeightPx } from './swimlaneRowReservedLayers';
import {
  SWIMLANE_STACKED_LAYER_GAP_PX,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from './taskLayerTaskLayout';

/**
 * Ширина ячейки в модели сторон. Лево/право на одной строке от неё не зависят.
 * Нужна, чтобы диагональ выбирала ту же сторону, что и стрелка на доске.
 */
const ANCHOR_CELL_WIDTH_PX = 40;
const ANCHOR_CARD_HEIGHT_PX = resolveSwimlaneOneCardHeightPx(false);
const ANCHOR_ROW_STRIDE_PX = ANCHOR_CARD_HEIGHT_PX + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
const ANCHOR_LAYER_STRIDE_PX = ANCHOR_CARD_HEIGHT_PX + SWIMLANE_STACKED_LAYER_GAP_PX;

interface OverdueBaselineLinkSideParams {
  assigneeOrder?: ReadonlyArray<{ id: string }>;
  qaTasksMap?: Map<string, Task>;
  taskId: string;
  taskLayerMap?: ReadonlyMap<string, number>;
  taskLinks: ReadonlyArray<{ fromTaskId: string; toTaskId: string }>;
  taskPositions?: Map<string, TaskPosition>;
  /** Пользовательские стрелки скрыты. Dev → QA рисуется и при выключенных связях. */
  userLinksVisible?: boolean;
}

function segmentCells(segment: PhaseSegment): { endCell: number; startCell: number } {
  const startCell = segment.startDay * getPartsPerDay() + segment.startPart;
  return { endCell: startCell + segment.duration, startCell };
}

function spanRightPx(endCell: number, startCell: number): number {
  return (startCell + Math.max(1, endCell - startCell)) * ANCHOR_CELL_WIDTH_PX;
}

function arrowCardRect(
  taskId: string,
  position: TaskPosition,
  rowIndex: Map<string, number>,
  taskLayerMap: ReadonlyMap<string, number> | undefined
): RectLike {
  const first = getOrderedPlanSegments(position)[0];
  const cells = first
    ? segmentCells(first)
    : { endCell: 1, startCell: 0 };
  const left = cells.startCell * ANCHOR_CELL_WIDTH_PX;
  const row = rowIndex.get(position.assignee) ?? 0;
  const layer = Math.max(0, taskLayerMap?.get(taskId) ?? 0);
  const top = row * ANCHOR_ROW_STRIDE_PX + layer * ANCHOR_LAYER_STRIDE_PX;
  return {
    bottom: top + ANCHOR_CARD_HEIGHT_PX,
    left,
    right: spanRightPx(cells.endCell, cells.startCell),
    top,
  };
}

function baselineStartPx(position: TaskPosition): number {
  const last = getOrderedPlanSegments(position).at(-1);
  if (!last) return 0;
  const cells = segmentCells(last);
  return spanRightPx(cells.endCell, cells.startCell);
}

function buildAssigneeRowIndex(
  assigneeOrder: ReadonlyArray<{ id: string }> | undefined,
  taskPositions: Map<string, TaskPosition>
): Map<string, number> {
  const index = new Map<string, number>();
  for (const developer of assigneeOrder ?? []) {
    if (!index.has(developer.id)) index.set(developer.id, index.size);
  }
  const extras = new Set<string>();
  for (const position of taskPositions.values()) {
    if (position.assignee && !index.has(position.assignee)) extras.add(position.assignee);
  }
  for (const assignee of [...extras].sort()) {
    index.set(assignee, index.size);
  }
  return index;
}

function collectArrowPeerIds(params: OverdueBaselineLinkSideParams): string[] {
  const peers: string[] = [];
  if (params.userLinksVisible !== false) {
    for (const link of params.taskLinks) {
      if (link.fromTaskId === params.taskId) peers.push(link.toTaskId);
      else if (link.toTaskId === params.taskId) peers.push(link.fromTaskId);
    }
  }
  const qaOfDev = params.qaTasksMap?.get(params.taskId);
  if (qaOfDev) peers.push(qaOfDev.id);
  params.qaTasksMap?.forEach((qaTask, devTaskId) => {
    if (qaTask.id === params.taskId) peers.push(devTaskId);
  });
  return peers;
}

function rightAnchorReachesOverdueBaseline(
  arrowRect: RectLike,
  peerRect: RectLike,
  baselineStart: number
): boolean {
  const side = resolveNearestSideAnchors(arrowRect, peerRect).fromAnchor.position;
  const leavesBaselineEdge = arrowRect.right === baselineStart;
  const reachesBaseline = peerRect.left >= baselineStart;
  return side === 'right' && (leavesBaselineEdge || reachesBaseline);
}

/**
 * Стрелка сидит на той же стороне, что и бейзлайн: выходит вправо из края,
 * от которого растёт полоса просрочки, либо идёт вправо через эту полосу.
 * Связь слева, сверху или снизу полосу не пересекает.
 */
export function linkSharesOverdueBaselineSide(params: OverdueBaselineLinkSideParams): boolean {
  const positions = params.taskPositions;
  const position = positions?.get(params.taskId);
  if (!positions || !position) return false;

  const rowIndex = buildAssigneeRowIndex(params.assigneeOrder, positions);
  const baselineStart = baselineStartPx(position);
  const arrowRect = arrowCardRect(params.taskId, position, rowIndex, params.taskLayerMap);

  for (const peerId of collectArrowPeerIds(params)) {
    if (peerId === params.taskId) continue;
    const peerPosition = positions.get(peerId);
    if (!peerPosition) continue;
    const peerRect = arrowCardRect(peerId, peerPosition, rowIndex, params.taskLayerMap);
    if (rightAnchorReachesOverdueBaseline(arrowRect, peerRect, baselineStart)) return true;
  }
  return false;
}
