'use client';


import {
  occupancyResizeGripLineClass,
} from './occupancyResizeHandleHelpers';

interface OccupancyResizeHandleGripProps {
  compact: boolean;
  gripOffset: string;
  handleColors: {
    bg: string;
    bgDark: string;
    hoverBg: string;
    hoverBgDark: string;
    line: string;
    lineDark: string;
  };
  isActive: boolean;
}

export function OccupancyResizeHandleGrip({
  compact,
  gripOffset,
  handleColors,
  isActive,
}: OccupancyResizeHandleGripProps) {
  return (
    <div
      className={`absolute ${gripOffset} top-1/2 -translate-y-1/2 flex flex-col ${compact ? 'gap-0.5' : 'gap-1'}`}
    >
      {[1, 2].map((i) => (
        <div
          key={i}
          className={`w-0.5 rounded transition-all ${compact ? 'h-2' : 'h-3'} ${occupancyResizeGripLineClass(isActive, handleColors)}`}
        />
      ))}
    </div>
  );
}

export function occupancyResizeHandleActiveClass(
  isActive: boolean,
  handleColors: { bg: string; bgDark: string; hoverBg: string; hoverBgDark: string }
): string {
  if (isActive) return `${handleColors.bg} ${handleColors.bgDark}`;
  return `${handleColors.hoverBg} ${handleColors.hoverBgDark}`;
}

export function occupancyResizeHandleHitAreaClass(compact: boolean): string {
  return compact ? 'w-4' : 'w-5';
}
