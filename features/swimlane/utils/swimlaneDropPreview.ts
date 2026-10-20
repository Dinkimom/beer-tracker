import type { SwimlaneLayerPackingItem } from '@/features/swimlane/utils/layerUtils';
import type { PlacedSpannedLayerItem } from '@/features/swimlane/utils/layerUtilsHelpers';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import type { Task, TaskPosition } from '@/types';

import {
  buildSwimlaneLayerPackingItems,
  calculateBaselines,
} from '@/features/swimlane/utils/layerUtils';
import {
  findSpannedLayerForItem,
  placeSpannedLayerItems,
  swimlaneLayerItemsConflict,
} from '@/features/swimlane/utils/layerUtilsHelpers';
import { applySwimlaneDragEndPositionUpdate } from '@/lib/layers/application/swimlaneDrag';
import { positionToStartCell } from '@/lib/planner-timeline';
import { resolveSwimlaneBaselinesForLayerPacking } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import { parseSwimlaneTaskDraggableId } from '@/lib/swimlane/swimlaneDragIds';

interface PositionedTask {
  position: TaskPosition;
  task: Task;
}

export interface SwimlaneDropPreviewTarget {
  activeDraggableId: string;
  activeTask: Task;
  durationCells: number;
  hoveredCell: { assigneeId: string; day: number; part: number };
}

interface SwimlaneDropPreviewSlot {
  durationCells: number;
  layer: number;
  span: number;
  startCell: number;
}

interface PlacedLaneItem extends PlacedSpannedLayerItem<SwimlaneLayerPackingItem> {
  startCell: number;
}

/**
 * Строка без перетаскиваемой карточки, уже разложенная по слоям.
 * Считается один раз на состояние строки; на каждую ячейку под курсором — только поиск слоя.
 */
interface SwimlaneDropPreviewLaneModel {
  baselineLayoutMode: SwimlaneBaselineLayoutMode;
  currentCell: number;
  placed: PlacedLaneItem[];
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
}

function packingBaselines(
  tasks: PositionedTask[],
  currentCell: number,
  mode: SwimlaneBaselineLayoutMode
) {
  return resolveSwimlaneBaselinesForLayerPacking(calculateBaselines(tasks, currentCell), mode);
}

export function buildSwimlaneDropPreviewLaneModel(input: {
  activeTaskId: string;
  baselineLayoutMode: SwimlaneBaselineLayoutMode;
  currentCell: number;
  laneTasks: PositionedTask[];
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
}): SwimlaneDropPreviewLaneModel {
  const others = input.laneTasks
    .filter(({ task }) => task.id !== input.activeTaskId)
    .sort((a, b) => positionToStartCell(a.position) - positionToStartCell(b.position));
  const items = buildSwimlaneLayerPackingItems(
    others,
    packingBaselines(others, input.currentCell, input.baselineLayoutMode),
    input.stickyNoteCardRowById
  );
  const placed = placeSpannedLayerItems(items, swimlaneLayerItemsConflict).map((entry) => ({
    ...entry,
    startCell: positionToStartCell(entry.item.position),
  }));
  return {
    baselineLayoutMode: input.baselineLayoutMode,
    currentCell: input.currentCell,
    placed,
    stickyNoteCardRowById: input.stickyNoteCardRowById,
  };
}

function resolveDroppedPosition(
  target: SwimlaneDropPreviewTarget,
  taskPositions: Map<string, TaskPosition>,
  totalCells: number
): TaskPosition | null {
  let dropped: TaskPosition | null = null;
  applySwimlaneDragEndPositionUpdate({
    finalCell: target.hoveredCell,
    onPositionUpdate: (_taskId, position) => {
      dropped = position;
    },
    segmentIndex: parseSwimlaneTaskDraggableId(target.activeDraggableId).segmentIndex,
    taskId: target.activeTask.id,
    taskPositions,
    tasks: [target.activeTask],
    totalCells,
  });
  return dropped;
}

/** Сколько уложенных карточек стоят раньше новой: сортировка по старту стабильна, новая — последней среди равных. */
function countItemsPlacedBefore(
  placed: PlacedLaneItem[],
  isQuickAddDraft: boolean,
  startCell: number
): number {
  let count = 0;
  for (const entry of placed) {
    const draftOrder = Number(entry.item.isQuickAddDraft) - Number(isQuickAddDraft);
    if (draftOrder > 0 || (draftOrder === 0 && entry.startCell > startCell)) {
      break;
    }
    count++;
  }
  return count;
}

/**
 * Слот карточки после drop: та же позиция, что применит drag-end, и тот же жадный
 * алгоритм слоёв. Жадная укладка не смотрит вперёд, поэтому слой новой карточки
 * зависит только от карточек, уложенных до неё. Геометрический бэкдроп ячеек
 * всегда возвращается (даже если apply отказал) — чтобы не «нащупывать» превью.
 */
export function resolveSwimlaneDropPreviewSlot(input: {
  lane: SwimlaneDropPreviewLaneModel;
  target: SwimlaneDropPreviewTarget;
  taskPositions: Map<string, TaskPosition>;
  totalCells: number;
}): SwimlaneDropPreviewSlot | null {
  const { lane, target } = input;
  const dropped = resolveDroppedPosition(target, input.taskPositions, input.totalCells);
  // Нет слота, если apply отказал (другая полоса для multi-segment и т.п.).
  if (!dropped) {
    return null;
  }
  const startCell = positionToStartCell(dropped);
  const droppedItem = { task: target.activeTask, position: dropped };
  const [activeItem] = buildSwimlaneLayerPackingItems(
    [droppedItem],
    packingBaselines([droppedItem], lane.currentCell, lane.baselineLayoutMode),
    lane.stickyNoteCardRowById
  );
  if (!activeItem) {
    return {
      durationCells: target.durationCells,
      layer: 0,
      span: 1,
      startCell,
    };
  }
  const before = countItemsPlacedBefore(
    lane.placed,
    activeItem.isQuickAddDraft,
    startCell
  );
  const placedActive = findSpannedLayerForItem(
    activeItem,
    lane.placed.slice(0, before),
    swimlaneLayerItemsConflict
  );
  return {
    durationCells: target.durationCells,
    layer: Math.max(0, placedActive.layer - placedActive.layerShiftUp),
    span: placedActive.span,
    startCell,
  };
}
