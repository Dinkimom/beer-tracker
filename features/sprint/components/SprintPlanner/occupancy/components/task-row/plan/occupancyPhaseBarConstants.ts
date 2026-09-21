import { PARTS_PER_DAY, WORKING_DAYS } from '@/constants';
import { PHASE_ROW_INSET_PX } from '@/lib/planner-timeline/phaseRowInset';

export { OCCUPANCY_FACT_PHASE_GAP_PX } from '@/lib/planner-timeline';
export { PHASE_ROW_INSET_PX };
/** Отступ полосы фазы от верхнего края контейнера (контейнер уже имеет отступ 4px от верха строки) */
export const PHASE_BAR_TOP_OFFSET_PX = 8;
/** Компактный режим строк занятости — меньший отступ и высота фазы */
export const PHASE_BAR_TOP_OFFSET_COMPACT_PX = 4;
/** Минимальный зазор между соседними фазами (по половине с каждой стороны полосы) */
const MIN_PHASE_GAP_HALF_PX = 2;
/** Половина толщины границы по горизонтали (border-2: 2px с каждой стороны) — учитываем в позиции/ширине */
const PHASE_BORDER_HALF_PX = 2;
/**
 * Отступ для плановых фаз в строке плана:
 * PHASE_ROW_INSET_PX + MIN_PHASE_GAP_HALF_PX + PHASE_BORDER_HALF_PX.
 */
export const PHASE_PLAN_ROW_INSET_PX =
  PHASE_ROW_INSET_PX + MIN_PHASE_GAP_HALF_PX + PHASE_BORDER_HALF_PX;
/** Высота полосы фазы (вертикально по центру строки); экспортируется для бейзлайна */
export const PHASE_BAR_HEIGHT_PX = 40;
/** Высота полосы фазы в компактном режиме строк занятости */
export const PHASE_BAR_HEIGHT_COMPACT_PX = 26;

export const TOTAL_PARTS = WORKING_DAYS * PARTS_PER_DAY;

export function cellToPosition(
  cellIndex: number
): { startDay: number; startPart: number } {
  const startDay = Math.floor(cellIndex / PARTS_PER_DAY);
  const startPart = cellIndex % PARTS_PER_DAY;
  return { startDay, startPart };
}

/** В режиме «1 ячейка = 1 день»: из индекса ячейки и длительности в ячейках — в позицию (duration в частях дня). */
export function cellsToPositionDayMode(
  startCell: number,
  durationCells: number
): { startDay: number; startPart: number; duration: number } {
  return {
    startDay: startCell,
    startPart: 0,
    duration: durationCells * PARTS_PER_DAY,
  };
}
