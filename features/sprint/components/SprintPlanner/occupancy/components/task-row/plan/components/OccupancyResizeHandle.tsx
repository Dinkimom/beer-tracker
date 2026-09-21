'use client';

import { ZIndex } from '@/constants';

import {
  occupancyResizeGripOffset,
  occupancyResizeSidePositionClass,
} from './occupancyResizeHandleHelpers';
import {
  OccupancyResizeHandleGrip,
  occupancyResizeHandleActiveClass,
  occupancyResizeHandleHitAreaClass,
} from './occupancyResizeHandleLayoutHelpers';

interface OccupancyResizeHandleProps {
  compact?: boolean;
  handleColors: {
    bg: string;
    bgDark: string;
    hoverBg: string;
    hoverBgDark: string;
    line: string;
    lineDark: string;
  };
  isActive: boolean;
  isHovering: boolean;
  side: 'left' | 'right';
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/** Ручка ресайза по краю полосы — цвета как в карточке задачи (TaskBarResizeHandle) */
export function OccupancyResizeHandle({
  handleColors,
  isActive,
  isHovering,
  compact = false,
  side,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}: OccupancyResizeHandleProps) {
  const showGrip = isHovering || isActive;
  const hitW = occupancyResizeHandleHitAreaClass(compact);
  const gripOffset = occupancyResizeGripOffset(compact, side);
  const sidePositionClass = occupancyResizeSidePositionClass(side);

  if (!showGrip) {
    return (
      <div
        className={`absolute ${sidePositionClass} top-0 bottom-0 ${hitW} ${ZIndex.class('stickyElevated')}`}
        style={{ pointerEvents: 'auto' }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    );
  }

  return (
    <div
      className={`absolute ${sidePositionClass} top-0 bottom-0 ${hitW} cursor-ew-resize group ${ZIndex.class('arrowsHovered')} transition-opacity ${occupancyResizeHandleActiveClass(isActive, handleColors)}`}
      style={{ touchAction: 'none', pointerEvents: 'auto' }}
      title={
        side === 'right'
          ? 'Изменить длительность (перетащите вправо)'
          : 'Изменить начало (перетащите влево)'
      }
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <OccupancyResizeHandleGrip
        compact={compact}
        gripOffset={gripOffset}
        handleColors={handleColors}
        isActive={isActive}
      />
    </div>
  );
}
