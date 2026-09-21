import type { OccupancyPhaseBarProps } from './occupancyPhaseBar.types';

import { getTaskPoints } from '@/features/task/utils/taskUtils';
import { storyPointsToTimeslots, timeslotsToStoryPoints } from '@/lib/pointsUtils';

export function computeOccupancyPhaseBarDurationMetrics(input: {
  dragDisplayDuration: number;
  durationCells: number;
  hideExtraDuration: boolean;
  isResizing: boolean;
  task: OccupancyPhaseBarProps['task'];
}): {
  estimatedPercent: number;
  extraPercent: number;
  extraSP: number;
  showExtraPlanDuration: boolean;
} {
  const estimatedSP = getTaskPoints(input.task);
  const estimatedTimeslots = storyPointsToTimeslots(estimatedSP);
  const baselineTimeslots = Math.max(estimatedTimeslots, input.durationCells);
  const baselineSP = Math.max(estimatedSP, timeslotsToStoryPoints(input.durationCells));
  const extraTimeslots = input.hideExtraDuration
    ? 0
    : Math.max(0, input.dragDisplayDuration - baselineTimeslots);
  const extraSP = input.hideExtraDuration
    ? 0
    : Math.max(0, timeslotsToStoryPoints(input.dragDisplayDuration) - baselineSP);
  const estimatedPercent =
    input.dragDisplayDuration > 0 ? (baselineTimeslots / input.dragDisplayDuration) * 100 : 0;
  const extraPercent =
    input.dragDisplayDuration > 0 ? (extraTimeslots / input.dragDisplayDuration) * 100 : 0;
  const showExtraPlanDuration =
    !input.hideExtraDuration && input.isResizing && extraTimeslots > 0;

  return { estimatedPercent, extraPercent, extraSP, showExtraPlanDuration };
}
