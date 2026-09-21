import type { ReactNode } from 'react';

import { formatPointsForDisplay } from '@/lib/pointsUtils';

import { phaseBarEndRadiusClass } from '../occupancyPhaseBarBarHelpers';

import { OccupancyPhaseBarDimmedBackground } from './OccupancyPhaseBarDimmedBackground';

function renderQaExtraDurationStripes(input: {
  estimatedPercent: number;
  extraPercent: number;
  qaBaseColor: string;
  qaStripedStyle: React.CSSProperties;
  squareCorners?: boolean;
}): ReactNode {
  return (
    <>
      <div
        className={`absolute left-0 top-0 bottom-0 ${phaseBarEndRadiusClass(input.squareCorners, 'l')} pointer-events-none`}
        style={{ width: `${input.estimatedPercent}%`, ...input.qaStripedStyle }}
      />
      <div
        className={`absolute right-0 top-0 bottom-0 ${phaseBarEndRadiusClass(input.squareCorners, 'r')} pointer-events-none`}
        style={{ width: `${input.extraPercent}%`, backgroundColor: input.qaBaseColor }}
      />
    </>
  );
}

function renderExtraSpLabel(
  estimatedPercent: number,
  extraPercent: number,
  extraSP: number,
  isQa: boolean
): ReactNode {
  if (extraSP <= 0) return null;
  return (
    <span
      className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold whitespace-nowrap text-gray-800 dark:text-white/95"
      style={{
        left: `${estimatedPercent}%`,
        width: `${extraPercent}%`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      +{formatPointsForDisplay(extraSP)} {isQa ? 'tp' : 'sp'}
    </span>
  );
}

function renderExtraDurationOverlay(
  backgroundDimmed: boolean,
  extraPercent: number,
  squareCorners?: boolean
): ReactNode {
  if (backgroundDimmed) return null;
  return (
    <div
      className={`absolute right-0 top-0 bottom-0 ${phaseBarEndRadiusClass(squareCorners, 'r')} pointer-events-none bg-white/40 dark:bg-black/25`}
      style={{ width: `${extraPercent}%` }}
    />
  );
}

export function renderOccupancyPhaseBarExtraDurationLayers(
  input: ExtraPlanDurationLayersInput
): ReactNode {
  const {
    showExtraPlanDuration,
    backgroundDimmed,
    isQa,
    qaStripedStyle,
    qaBaseColor,
    estimatedPercent,
    extraPercent,
    extraSP,
    dividerBgClass,
    squareCorners,
  } = input;
  if (!showExtraPlanDuration) return null;

  return (
    <>
      {!backgroundDimmed && isQa && qaStripedStyle && qaBaseColor
        ? renderQaExtraDurationStripes({
            estimatedPercent,
            extraPercent,
            qaBaseColor,
            qaStripedStyle,
            squareCorners,
          })
        : null}
      {renderExtraDurationOverlay(backgroundDimmed, extraPercent, squareCorners)}
      <div
        className={`absolute top-0 bottom-0 w-0.5 pointer-events-none ${dividerBgClass}`}
        style={{ left: `${estimatedPercent}%` }}
      />
      {renderExtraSpLabel(estimatedPercent, extraPercent, extraSP, isQa)}
    </>
  );
}

interface ExtraPlanDurationLayersInput {
  backgroundDimmed: boolean;
  dividerBgClass: string;
  estimatedPercent: number;
  extraPercent: number;
  extraSP: number;
  isQa: boolean;
  phaseFillClass: string;
  qaBaseColor?: string;
  qaStripedStyle?: React.CSSProperties;
  showExtraPlanDuration: boolean;
  squareCorners?: boolean;
}

export function renderOccupancyPhaseBarDimmedBackgroundLayer(input: {
  backgroundDimmed: boolean;
  estimatedPercent: number;
  extraPercent: number;
  isQa: boolean;
  phaseFillClass: string;
  qaBaseColor?: string;
  qaStripedStyle?: React.CSSProperties;
  showExtraPlanDuration: boolean;
  squareCorners?: boolean;
}): ReactNode {
  if (!input.backgroundDimmed) return null;
  const fillRadius = phaseBarEndRadiusClass(input.squareCorners);
  return (
    <div aria-hidden className={`absolute inset-0 ${fillRadius} pointer-events-none opacity-50`}>
      <OccupancyPhaseBarDimmedBackground
        estimatedPercent={input.estimatedPercent}
        extraPercent={input.extraPercent}
        isQa={input.isQa}
        phaseFillClass={input.phaseFillClass}
        qaBaseColor={input.qaBaseColor}
        qaStripedStyle={input.qaStripedStyle}
        showExtraPlanDuration={input.showExtraPlanDuration}
        squareCorners={input.squareCorners}
      />
      {input.showExtraPlanDuration ? (
        <div
          className={`absolute right-0 top-0 bottom-0 ${phaseBarEndRadiusClass(input.squareCorners, 'r')} bg-white/40 dark:bg-black/25`}
          style={{ width: `${input.extraPercent}%` }}
        />
      ) : null}
    </div>
  );
}
