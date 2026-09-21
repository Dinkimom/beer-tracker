import type { CSSProperties } from 'react';

import {
  phaseBarEndRadiusClass,
  phaseBarRadiusClass,
} from '../occupancyPhaseBarBarHelpers';

interface OccupancyPhaseBarDimmedBackgroundProps {
  estimatedPercent: number;
  extraPercent: number;
  isQa: boolean;
  phaseFillClass: string;
  qaBaseColor?: string;
  qaStripedStyle?: CSSProperties;
  showExtraPlanDuration: boolean;
  squareCorners?: boolean;
}

export function OccupancyPhaseBarDimmedBackground({
  showExtraPlanDuration,
  isQa,
  qaStripedStyle,
  qaBaseColor,
  estimatedPercent,
  extraPercent,
  phaseFillClass,
  squareCorners,
}: OccupancyPhaseBarDimmedBackgroundProps) {
  const fillRadius = phaseBarRadiusClass(squareCorners);
  if (showExtraPlanDuration && isQa && qaStripedStyle && qaBaseColor) {
    return (
      <>
        <div
          className={`absolute left-0 top-0 bottom-0 ${phaseBarEndRadiusClass(squareCorners, 'l')}`}
          style={{ width: `${estimatedPercent}%`, ...qaStripedStyle }}
        />
        <div
          className={`absolute right-0 top-0 bottom-0 ${phaseBarEndRadiusClass(squareCorners, 'r')}`}
          style={{
            width: `${extraPercent}%`,
            backgroundColor: qaBaseColor,
          }}
        />
      </>
    );
  }

  if (showExtraPlanDuration && !isQa) {
    return <div className={`absolute inset-0 ${fillRadius} ${phaseFillClass}`} />;
  }

  return (
    <div
      className={`absolute inset-0 ${fillRadius} ${qaStripedStyle ? '' : phaseFillClass}`}
      style={qaStripedStyle ?? undefined}
    />
  );
}
