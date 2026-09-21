'use client';

import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';
import type React from 'react';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { getSegmentEditorRangeAndCells } from '@/features/sprint/utils/occupancyUtils';
import { getTaskCardStyles } from '@/features/task/components/TaskCard/components/TaskCardBody';
import { getTeamTagClasses } from '@/utils/teamColors';

import { resolveQaPhaseSegmentsSorted, shouldRenderQaSegmentEditor } from './occupancyQaPhaseBarsHelpers';
import { OccupancyQaSegmentPhaseBarItem } from './OccupancyQaSegmentPhaseBarItem';
import { OccupancyQaSinglePhaseBar } from './OccupancyQaSinglePhaseBar';
import { PhaseSegmentInlineEditor } from './PhaseSegmentInlineEditor';

export function OccupancyQaPhaseBars(props: OccupancyPlanPhaseBarsProps) {
  const {
    phaseBarHeightPx,
    phaseBarTopOffsetPx,
    qaAssignee,
    qaInitials,
    qaPosition,
    qaPositionAssignee,
    qaTask,
    totalParts,
    onSegmentEditCancel,
    onSegmentEditSave,
  } = props;

  const phaseCardColorScheme = usePhaseCardColorScheme();
  if (!qaTask || !qaPosition) return null;

  const qaAvatarUrl = qaPositionAssignee?.avatarUrl ?? qaAssignee?.avatarUrl;
  const qaAssigneeDisplayName = qaPositionAssignee?.name ?? qaAssignee?.name;

  if (shouldRenderQaSegmentEditor(props)) {
    const { rangeStartCell, totalCells, initialCells } = getSegmentEditorRangeAndCells(qaPosition);
    const cardStyles = getTaskCardStyles(qaTask, 'swimlane', phaseCardColorScheme);
    return (
      <PhaseSegmentInlineEditor
        avatarUrl={qaAvatarUrl}
        badgeClass={getTeamTagClasses('QA')}
        barHeight={phaseBarHeightPx}
        barTopOffset={phaseBarTopOffsetPx}
        initialCells={initialCells}
        initials={qaInitials}
        isQa
        originalStatus={qaTask.originalStatus}
        rangeStartCell={rangeStartCell}
        statusColorKey={qaTask.statusColorKey}
        teamBorder={cardStyles.teamBorder}
        teamColor={cardStyles.teamColor}
        totalCells={totalCells}
        totalParts={totalParts}
        onCancel={onSegmentEditCancel!}
        onSave={(segments) => {
          onSegmentEditSave!(qaPosition, segments, true);
        }}
      />
    );
  }

  const cardStyles = getTaskCardStyles(qaTask, 'swimlane', phaseCardColorScheme);
  const qaSegmentsSorted = resolveQaPhaseSegmentsSorted(qaPosition);

  if (qaSegmentsSorted && qaSegmentsSorted.length > 0) {
    const qaBars = qaSegmentsSorted.map((_, idx) => (
      <OccupancyQaSegmentPhaseBarItem
        key={`qa-seg-${idx}`}
        cardStyles={cardStyles}
        idx={idx}
        props={props}
        qaAssigneeDisplayName={qaAssigneeDisplayName}
        qaAvatarUrl={qaAvatarUrl}
        qaInitials={qaInitials}
        qaPosition={qaPosition}
        qaSegmentsSorted={qaSegmentsSorted}
        qaTask={qaTask}
      />
    ));
    return qaBars as React.ReactNode;
  }

  return (
    <OccupancyQaSinglePhaseBar
      cardStyles={cardStyles}
      props={props}
      qaAssigneeDisplayName={qaAssigneeDisplayName}
      qaAvatarUrl={qaAvatarUrl}
      qaPosition={qaPosition}
      qaTask={qaTask}
    />
  );
}
