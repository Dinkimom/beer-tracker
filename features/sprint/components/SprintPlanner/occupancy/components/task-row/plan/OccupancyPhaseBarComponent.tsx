'use client';

import type { OccupancyPhaseBarProps } from './occupancyPhaseBar.types';

import React from 'react';

import { TextTooltip } from '@/components/TextTooltip';

import { OccupancyPhaseDragSourceGhost } from './components/OccupancyPhaseDragSourceGhost';
import { PlannedInSprintTooltipContent } from './components/PlannedInSprintTooltipContent';
import {
  PHASE_BAR_HEIGHT_PX,
  PHASE_BAR_TOP_OFFSET_PX,
} from './occupancyPhaseBarConstants';
import { OccupancyPhaseBarSurface } from './OccupancyPhaseBarSurface';
import { useOccupancyPhaseBarViewModel } from './useOccupancyPhaseBarViewModel';

function OccupancyPhaseBarInner(props: OccupancyPhaseBarProps) {
  const viewModel = useOccupancyPhaseBarViewModel(props);
  const {
    barHeight,
    barTopOffset,
    plannedInSprintVariant = false,
    position,
    planRowInsetPx = viewModel.planRowInsetPx,
    squareCorners = false,
  } = props;

  const dragSourceGhost = viewModel.showDragSourceGhost ? (
    <OccupancyPhaseDragSourceGhost
      barHeightPx={barHeight ?? PHASE_BAR_HEIGHT_PX}
      barTopOffsetPx={barTopOffset ?? PHASE_BAR_TOP_OFFSET_PX}
      barZIndex={viewModel.barZIndex}
      endCell={viewModel.endCell}
      planRowInsetPx={planRowInsetPx}
      resolvedTotalParts={viewModel.resolvedTotalParts}
      squareCorners={squareCorners}
      startCell={viewModel.startCell}
    />
  ) : null;

  const bar = <OccupancyPhaseBarSurface props={props} viewModel={viewModel} />;

  if (plannedInSprintVariant && position.sourceTaskId) {
    return (
      <TextTooltip
        content={
          <PlannedInSprintTooltipContent
            taskKey={position.sourceTaskId}
          />
        }
        contentClassName="!p-0 !shadow-none !max-w-none !bg-white dark:!bg-gray-800"
        delayDuration={400}
        interactive
      >
        <>
          {dragSourceGhost}
          {bar}
        </>
      </TextTooltip>
    );
  }
  return (
    <>
      {dragSourceGhost}
      {bar}
    </>
  );
}

OccupancyPhaseBarInner.displayName = 'OccupancyPhaseBar';
export const OccupancyPhaseBar = OccupancyPhaseBarInner;
