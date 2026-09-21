'use client';

import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { getTaskCardStyles } from '@/features/task/components/TaskCard/components/TaskCardBody';

import { OccupancyDevMainPhaseBars } from './OccupancyDevMainPhaseBars';
import { sortPhaseSegmentsByTimeline } from './occupancyDevPhaseBarsHelpers';
import { OccupancyDevSegmentEditor } from './OccupancyDevSegmentEditor';
import { OccupancyDevSegmentPhaseBarsList } from './OccupancyDevSegmentPhaseBarsList';

function useOccupancyDevPhaseCardStyles(
  effectivelyQa: boolean,
  task: OccupancyPlanPhaseBarsProps['task']
) {
  const phaseCardColorScheme = usePhaseCardColorScheme();
  return effectivelyQa
    ? getTaskCardStyles({ ...task, team: 'QA' }, 'swimlane', phaseCardColorScheme)
    : getTaskCardStyles(task, 'swimlane', phaseCardColorScheme);
}

function resolveOccupancyDevSegmentsSorted(position: OccupancyPlanPhaseBarsProps['position']) {
  if (!position?.segments || position.segments.length === 0) return null;
  return sortPhaseSegmentsByTimeline(position.segments);
}

function shouldShowOccupancyDevSegmentEditor(
  props: OccupancyPlanPhaseBarsProps
): boolean {
  return (
    props.segmentEditTaskId === props.task.id &&
    Boolean(props.onSegmentEditSave && props.onSegmentEditCancel)
  );
}

export function OccupancyDevPhaseBars(props: OccupancyPlanPhaseBarsProps) {
  const {
    effectivelyQa,
    onSegmentEditCancel,
    onSegmentEditSave,
    phaseBarHeightPx,
    phaseBarTopOffsetPx,
    position,
    positionAssignee,
    segmentEditTaskId,
    task,
    totalParts,
  } = props;

  const cardStyles = useOccupancyDevPhaseCardStyles(effectivelyQa, task);
  const devSegmentsSorted = resolveOccupancyDevSegmentsSorted(position);
  const showSegmentEditor = shouldShowOccupancyDevSegmentEditor(props);

  if (!position) return null;

  if (showSegmentEditor) {
    return (
      <OccupancyDevSegmentEditor
        effectivelyQa={effectivelyQa}
        initials={props.initials}
        phaseBarHeightPx={phaseBarHeightPx}
        phaseBarTopOffsetPx={phaseBarTopOffsetPx}
        position={position}
        positionAssignee={positionAssignee}
        segmentEditTaskId={segmentEditTaskId}
        task={task}
        totalParts={totalParts}
        onSegmentEditCancel={onSegmentEditCancel!}
        onSegmentEditSave={onSegmentEditSave!}
      />
    );
  }

  if (devSegmentsSorted && devSegmentsSorted.length > 0) {
    return (
      <OccupancyDevSegmentPhaseBarsList
        barsProps={props}
        cardStyles={cardStyles}
        devSegmentsSorted={devSegmentsSorted}
      />
    );
  }

  return <OccupancyDevMainPhaseBars cardStyles={cardStyles} props={props} />;
}
