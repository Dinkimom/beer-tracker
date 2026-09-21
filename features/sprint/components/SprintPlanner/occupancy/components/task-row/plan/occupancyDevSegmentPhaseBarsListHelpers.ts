import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';
import type { TaskPosition } from '@/types';

import { mergeAdjacentSegments, withMergedPlanSegments } from '@/features/sprint/utils/occupancyUtils';

export function buildDevSegmentPhaseBarPosition(
  position: TaskPosition,
  seg: NonNullable<TaskPosition['segments']>[number],
  displayAsWeeks: boolean,
  toWeekPosition: OccupancyPlanPhaseBarsProps['toWeekPosition']
): TaskPosition {
  const segmentPosition = {
    ...position,
    duration: seg.duration,
    startDay: seg.startDay,
    startPart: seg.startPart,
  };
  return displayAsWeeks ? toWeekPosition(segmentPosition) : segmentPosition;
}

export function buildDevSegmentPhaseBarSaveHandler(input: {
  displayAsWeeks: boolean;
  fromWeekPosition: OccupancyPlanPhaseBarsProps['fromWeekPosition'];
  onPositionSave?: OccupancyPlanPhaseBarsProps['onPositionSave'];
  position: TaskPosition;
  seg: NonNullable<TaskPosition['segments']>[number];
}) {
  const { position, seg, displayAsWeeks, fromWeekPosition, onPositionSave } = input;
  return (p: TaskPosition) => {
    const dayP = displayAsWeeks ? fromWeekPosition(p) : p;
    const newSegments = [...position.segments!];
    const origIdx = position.segments!.findIndex(
      (s) => s.startDay === seg.startDay && s.startPart === seg.startPart && s.duration === seg.duration
    );
    if (origIdx !== -1) {
      newSegments[origIdx] = {
        duration: dayP.duration,
        startDay: dayP.startDay,
        startPart: dayP.startPart,
      };
    }
    const merged = mergeAdjacentSegments(newSegments);
    onPositionSave?.(withMergedPlanSegments(position, merged), false);
  };
}
