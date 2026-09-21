'use client';

import { CARD_MARGIN, PARTS_PER_DAY, WORKING_DAYS } from '@/constants';

interface SwimlaneLinkingTargetOutlineProps {
  containerStyle: React.CSSProperties;
  outlineRadiusClass?: string;
  rangeStartCell: number;
  timelineTotalParts?: number;
  totalCells: number;
}

/**
 * Обводка цели связи: только на ховер (плюс превью стрелки в слое связей).
 */
export function SwimlaneLinkingTargetOutline({
  containerStyle,
  outlineRadiusClass = 'rounded-lg',
  rangeStartCell,
  timelineTotalParts = WORKING_DAYS * PARTS_PER_DAY,
  totalCells,
}: SwimlaneLinkingTargetOutlineProps) {
  const leftPercent = (rangeStartCell / timelineTotalParts) * 100;
  const widthPercent = (totalCells / timelineTotalParts) * 100;
  const barLeft = `calc(${leftPercent}% + ${CARD_MARGIN}px)`;
  const barWidth = `calc(${widthPercent}% - ${CARD_MARGIN * 2}px)`;

  return (
    <div className="pointer-events-none absolute left-0 right-0" style={containerStyle}>
      <div
        aria-hidden
        className={`pointer-events-none absolute ${outlineRadiusClass} bg-blue-400/20 ring-2 ring-blue-400 dark:bg-blue-500/25 dark:ring-blue-400`}
        style={{ left: barLeft, width: barWidth, top: 0, bottom: 0 }}
      />
    </div>
  );
}
