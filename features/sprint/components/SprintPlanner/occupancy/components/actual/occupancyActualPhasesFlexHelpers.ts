import type { StatusPhaseCell } from '../../utils/statusToCells';

export function isClosedFactPhase(phase: StatusPhaseCell): boolean {
  return phase.statusKey.toLowerCase().replace(/\s+/g, '') === 'closed';
}

interface FactPhaseFlexSegment {
  accounted: number;
  leftInSpan: number;
  phase: StatusPhaseCell;
  prevEnd: number;
  spacerCells: number;
  widthInSpan: number;
}

export function computeFactPhaseFlexSegment(
  phase: StatusPhaseCell,
  idx: number,
  visiblePhases: StatusPhaseCell[],
  timelineStartCell: number,
  spanCells: number
): FactPhaseFlexSegment {
  const leftInSpan = Math.max(0, phase.startCell - timelineStartCell);
  const prevEnd = idx === 0 ? 0 : visiblePhases[idx - 1]!.endCell - timelineStartCell;
  const spacerCells = Math.max(0, leftInSpan - prevEnd);
  const widthInSpan = Math.min(phase.endCell - phase.startCell, spanCells - leftInSpan);
  return {
    phase,
    leftInSpan,
    prevEnd,
    spacerCells,
    widthInSpan,
    accounted: spacerCells + widthInSpan,
  };
}

export function computeFactPhaseTailFlex(accounted: number, spanCells: number): number {
  return Math.max(0, spanCells - accounted);
}
