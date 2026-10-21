import type { PhaseSegment, Task, TaskPosition } from '@/types';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';

interface PlanAnchorGeometry {
  duration: number;
  segments?: PhaseSegment[] | null;
  startDay: number;
  startPart: number;
}

type PlanGeometry = Pick<TaskPosition, 'duration' | 'segments' | 'startDay' | 'startPart'>;

type ShiftTask = Pick<Task, 'id' | 'isLocalTask' | 'localDraftKind'>;

function segmentStartCell(segment: PhaseSegment, partsPerDay: number): number {
  return segment.startDay * partsPerDay + segment.startPart;
}

function geometrySegments(geometry: PlanAnchorGeometry | PlanGeometry): PhaseSegment[] {
  if (geometry.segments && geometry.segments.length > 0) return geometry.segments;
  return [
    {
      duration: geometry.duration,
      startDay: geometry.startDay,
      startPart: geometry.startPart,
    },
  ];
}

function planEndCell(geometry: PlanAnchorGeometry | PlanGeometry, partsPerDay: number): number {
  return geometrySegments(geometry).reduce(
    (end, segment) => Math.max(end, segmentStartCell(segment, partsPerDay) + segment.duration),
    0
  );
}

function planStartCell(geometry: PlanAnchorGeometry | PlanGeometry, partsPerDay: number): number {
  return Math.min(...geometrySegments(geometry).map((segment) => segmentStartCell(segment, partsPerDay)));
}

function planCostCells(geometry: PlanAnchorGeometry | PlanGeometry): number {
  return geometrySegments(geometry).reduce((sum, segment) => sum + segment.duration, 0);
}

function isShiftTrackedTask(task: ShiftTask): boolean {
  if (task.isLocalTask || task.localDraftKind) return false;
  return parseSwimlaneCommentTaskId(task.id) == null;
}

/**
 * Отличие текущего плана от плана на старте работы.
 * `costDeltaCells` — изменение стоимости (суммарной длины отрезков), `deadlineCell` — исходный срок,
 * если конец плана уехал хотя бы на рабочий день (в любую сторону), `startShiftCells` — сдвиг начала (+ — позже).
 */
export function resolvePlanAnchorDiff(input: {
  anchor: PlanAnchorGeometry | undefined;
  partsPerDay: number;
  position: PlanGeometry;
  task: ShiftTask;
}): {
  costDeltaCells: number;
  currentEndCell: number;
  deadlineCell: number | null;
  currentStartCell: number;
  startShiftCells: number;
} | null {
  const { anchor, partsPerDay, position } = input;
  if (!anchor || partsPerDay <= 0 || !isShiftTrackedTask(input.task)) return null;
  const anchorEnd = planEndCell(anchor, partsPerDay);
  const currentEnd = planEndCell(position, partsPerDay);
  const costDeltaCells = planCostCells(position) - planCostCells(anchor);
  const deadlineCell = Math.abs(currentEnd - anchorEnd) >= partsPerDay ? anchorEnd : null;
  if (costDeltaCells === 0 && deadlineCell == null) return null;
  const currentStartCell = planStartCell(position, partsPerDay);
  return {
    costDeltaCells,
    currentEndCell: currentEnd,
    currentStartCell,
    deadlineCell,
    startShiftCells: currentStartCell - planStartCell(anchor, partsPerDay),
  };
}

export interface SegmentPlanAnchorOverlay {
  /**
   * Сколько ячеек исходной стоимости приходится на отрезок от его начала (по порядку отрезков).
   * Всё, что дальше, — стоимость, добавленная после старта работы.
   */
  baseCells: number;
  /** Перенос относительно плана на старте — только у первого отрезка, чтобы значок был один. */
  moved: 'earlier' | 'later' | null;
}

/**
 * Исходная стоимость в пределах отрезка карточки. Не зависит от текущей длины отрезка,
 * поэтому карточка пересчитывает штриховку на лету, в том числе во время ресайза.
 */
export function resolveSegmentPlanAnchorOverlay(input: {
  anchor: PlanAnchorGeometry | undefined;
  partsPerDay: number;
  position: PlanGeometry;
  segment: PhaseSegment;
  task: ShiftTask;
}): SegmentPlanAnchorOverlay | null {
  const { anchor, partsPerDay } = input;
  if (!anchor || partsPerDay <= 0 || !isShiftTrackedTask(input.task)) return null;
  const segmentStart = segmentStartCell(input.segment, partsPerDay);
  const offset = geometrySegments(input.position)
    .filter((other) => segmentStartCell(other, partsPerDay) < segmentStart)
    .reduce((sum, other) => sum + other.duration, 0);
  const startShift =
    segmentStart === planStartCell(input.position, partsPerDay)
      ? (resolvePlanAnchorDiff(input)?.startShiftCells ?? 0)
      : 0;
  let moved: SegmentPlanAnchorOverlay['moved'] = null;
  if (startShift > 0) moved = 'later';
  else if (startShift < 0) moved = 'earlier';
  return { baseCells: planCostCells(anchor) - offset, moved };
}

/** Доля ширины отрезка, с которой начинается штриховка добавленной стоимости, или null. */
export function planAnchorHatchStartFraction(
  baseCells: number,
  durationCells: number
): number | null {
  if (durationCells <= 0 || baseCells >= durationCells) return null;
  return Math.max(0, baseCells) / durationCells;
}

/** Отрезки плана на старте работы в ячейках таймлайна — для контура при наведении. */
export function planAnchorCellRanges(
  anchor: PlanAnchorGeometry,
  partsPerDay: number
): Array<{ duration: number; start: number }> {
  return geometrySegments(anchor).map((segment) => ({
    duration: segment.duration,
    start: segmentStartCell(segment, partsPerDay),
  }));
}

/**
 * Задача под курсором, которую перенесли относительно плана на старте работы:
 * на время наведения остальные карточки приглушаются, чтобы был виден исходный план.
 * Если начало на месте, исходный план не показываем — рост стоимости виден по штриховке.
 */
export function resolvePlanAnchorFocusTaskId(input: {
  anchors: ReadonlyMap<string, PlanAnchorGeometry>;
  hoveredTaskId: string | null;
  partsPerDay: number;
  positions: ReadonlyMap<string, PlanGeometry>;
  tasks: ReadonlyMap<string, ShiftTask>;
}): string | null {
  const { hoveredTaskId } = input;
  if (!hoveredTaskId) return null;
  const position = input.positions.get(hoveredTaskId);
  const task = input.tasks.get(hoveredTaskId);
  if (!position || !task) return null;
  const diff = resolvePlanAnchorDiff({
    anchor: input.anchors.get(hoveredTaskId),
    partsPerDay: input.partsPerDay,
    position,
    task,
  });
  return diff && diff.startShiftCells !== 0 ? hoveredTaskId : null;
}
