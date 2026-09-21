/**
 * Общие константы и чистые функции таймлайна/фаз планера (sprint occupancy + swimlane).
 * Импорты из `features/sprint/.../occupancy` в swimlane сюда — по мере миграции F1.
 */

export { OCCUPANCY_FACT_PHASE_GAP_PX } from './factPhaseGap';
export { formatDuration } from './formatOccupancyDuration';
export * from './occupancyErrorMessages';
export * from './occupancyUtils';
export { PHASE_ROW_INSET_PX } from './phaseRowInset';
export {
  getPhaseFocusRingClass,
  PHASE_FOCUS_RING_SOURCE,
} from './phaseFocusRing';
export { dateTimeToFractionalCellInRange } from './sprintCellUtils';
export type {  StatusPhaseCell } from './statusToCells';
export { statusDurationsToCells } from './statusToCells';
export {
  mergeDbPositionsWithTrackerDateFallbacks,
  parseTrackerIsoDateOnlyLocal,
} from './trackerDatesToPlannedPosition';
