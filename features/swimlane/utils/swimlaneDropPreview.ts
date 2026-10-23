import type { PlacedSwimlaneLayerItem } from '@/features/swimlane/utils/layerUtils';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import type { Task, TaskPosition } from '@/types';

import {
  buildSwimlaneLayerPackingItems,
  calculateBaselines,
  insertSwimlaneLayerItemInLane,
  placeSwimlaneLayerItemInAutoLane,
  placeSwimlaneLayerItems,
  sortSwimlaneLayerItemsByRow,
} from '@/features/swimlane/utils/layerUtils';
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
  hoveredCell: { assigneeId: string; day: number; layer?: number; part: number };
}

interface SwimlaneDropPreviewSlot {
  durationCells: number;
  layer: number;
  /** Чтобы встать сюда, карточка сдвинет соседей вниз — превью чертой между слоями. */
  pushesCards: boolean;
  span: number;
  startCell: number;
}

/**
 * Строка без перетаскиваемой карточки. Считается один раз на состояние строки;
 * на каждую ячейку под курсором — только поиск слоя.
 * Автосортировка: соседи переразложены без неё, слой — по жадной укладке.
 * Ручной режим: соседи на своих местах (как на доске), карточка встаёт на слой под курсором.
 */
interface SwimlaneDropPreviewLaneModel {
  autoArrange: boolean;
  baselineLayoutMode: SwimlaneBaselineLayoutMode;
  currentCell: number;
  placed: PlacedSwimlaneLayerItem[];
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
  /** По умолчанию — ручной режим, если передан `placed`, иначе автосортировка. */
  autoArrange?: boolean;
  baselineLayoutMode: SwimlaneBaselineLayoutMode;
  currentCell: number;
  laneTasks: PositionedTask[];
  /** Ручной режим: раскладка строки, как на доске. */
  placed?: readonly PlacedSwimlaneLayerItem[];
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
}): SwimlaneDropPreviewLaneModel {
  const autoArrange = input.autoArrange ?? input.placed == null;
  const base = {
    autoArrange,
    baselineLayoutMode: input.baselineLayoutMode,
    currentCell: input.currentCell,
    stickyNoteCardRowById: input.stickyNoteCardRowById,
  };
  if (autoArrange || !input.placed) {
    const others = input.laneTasks.filter(({ task }) => task.id !== input.activeTaskId);
    const placed = placeSwimlaneLayerItems(
      others,
      packingBaselines(others, input.currentCell, input.baselineLayoutMode),
      input.stickyNoteCardRowById
    );
    return { ...base, autoArrange, placed: autoArrange ? placed : sortSwimlaneLayerItemsByRow(placed) };
  }
  return {
    ...base,
    placed: sortSwimlaneLayerItemsByRow(input.placed.filter(({ item }) => item.id !== input.activeTaskId)),
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

/**
 * Слот карточки после drop: та же позиция, что применит drag-end, и слой под верхним краем
 * карточки — мешающие соседи сдвинутся вниз (так же считает drag-end).
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
      pushesCards: false,
      span: 1,
      startCell,
    };
  }
  if (lane.autoArrange) {
    const inputOrder = new Map([...input.taskPositions.keys()].map((id, index) => [id, index]));
    const placedActive = placeSwimlaneLayerItemInAutoLane(lane.placed, activeItem, inputOrder);
    return {
      durationCells: target.durationCells,
      layer: Math.max(0, placedActive.layer - placedActive.layerShiftUp),
      pushesCards: false,
      span: placedActive.span,
      startCell,
    };
  }
  const targetTopLayer = target.hoveredCell.layer ?? 0;
  const { layer, pushesCards } = insertSwimlaneLayerItemInLane(
    lane.placed,
    activeItem,
    targetTopLayer + activeItem.layerShiftUp
  );
  return {
    durationCells: target.durationCells,
    layer: Math.max(0, layer - activeItem.layerShiftUp),
    pushesCards,
    span: Math.max(1, activeItem.span),
    startCell,
  };
}
