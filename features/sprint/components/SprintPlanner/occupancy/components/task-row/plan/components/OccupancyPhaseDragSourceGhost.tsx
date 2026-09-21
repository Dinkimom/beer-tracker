import React from 'react';

import { phaseBarRadiusClass } from '../occupancyPhaseBarBarHelpers';

interface OccupancyPhaseDragSourceGhostProps {
  barHeightPx: number;
  barTopOffsetPx: number;
  barZIndex: number;
  endCell: number;
  planRowInsetPx: number;
  resolvedTotalParts: number;
  squareCorners?: boolean;
  startCell: number;
}

export function OccupancyPhaseDragSourceGhost({
  barHeightPx,
  barTopOffsetPx,
  barZIndex,
  resolvedTotalParts,
  startCell,
  endCell,
  planRowInsetPx,
  squareCorners,
}: OccupancyPhaseDragSourceGhostProps) {
  const leftPercent = (startCell / resolvedTotalParts) * 100;
  const rightPercent = ((resolvedTotalParts - endCell) / resolvedTotalParts) * 100;

  return (
    <div
      aria-hidden
      className={`absolute ${phaseBarRadiusClass(squareCorners)} border-2 border-dashed border-gray-400/70 dark:border-white/30 bg-transparent pointer-events-none`}
      style={{
        left: `calc(${leftPercent}% + ${planRowInsetPx}px)`,
        right: `calc(${rightPercent}% + ${planRowInsetPx}px)`,
        height: barHeightPx,
        opacity: 0.9,
        top: barTopOffsetPx,
        zIndex: Math.max(0, barZIndex - 1),
      }}
    />
  );
}

