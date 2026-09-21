'use client';

import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { getSegmentEditorRangeAndCells } from '@/features/sprint/utils/occupancyUtils';
import { getTaskCardStyles } from '@/features/task/components/TaskCard/components/TaskCardBody';
import { getTeamTagClasses } from '@/utils/teamColors';

import { PhaseSegmentInlineEditor } from './PhaseSegmentInlineEditor';

type Props = Pick<
  OccupancyPlanPhaseBarsProps,
  | 'effectivelyQa'
  | 'initials'
  | 'onSegmentEditCancel'
  | 'onSegmentEditSave'
  | 'phaseBarHeightPx'
  | 'phaseBarTopOffsetPx'
  | 'position'
  | 'positionAssignee'
  | 'segmentEditTaskId'
  | 'task'
  | 'totalParts'
>;

export function OccupancyDevSegmentEditor({
  effectivelyQa,
  initials,
  onSegmentEditCancel,
  onSegmentEditSave,
  phaseBarHeightPx,
  phaseBarTopOffsetPx,
  position,
  positionAssignee,
  segmentEditTaskId,
  task,
  totalParts,
}: Props) {
  const phaseCardColorScheme = usePhaseCardColorScheme();
  if (!position || segmentEditTaskId !== task.id || !onSegmentEditSave || !onSegmentEditCancel) {
    return null;
  }

  const { rangeStartCell, totalCells, initialCells } = getSegmentEditorRangeAndCells(position);
  const cardStyles = effectivelyQa
    ? getTaskCardStyles({ ...task, team: 'QA' }, 'swimlane', phaseCardColorScheme)
    : getTaskCardStyles(task, 'swimlane', phaseCardColorScheme);

  return (
    <PhaseSegmentInlineEditor
      avatarUrl={positionAssignee?.avatarUrl}
      badgeClass={effectivelyQa ? getTeamTagClasses('QA') : getTeamTagClasses(task.team)}
      barHeight={phaseBarHeightPx}
      barTopOffset={phaseBarTopOffsetPx}
      initialCells={initialCells}
      initials={initials}
      originalStatus={task.originalStatus}
      rangeStartCell={rangeStartCell}
      statusColorKey={task.statusColorKey}
      teamBorder={cardStyles.teamBorder}
      teamColor={cardStyles.teamColor}
      totalCells={totalCells}
      totalParts={totalParts}
      onCancel={onSegmentEditCancel}
      onSave={(segments) => {
        onSegmentEditSave(position, segments, effectivelyQa);
      }}
    />
  );
}
