'use client';

import type { getResizeHandleColors } from '@/utils/statusColors';

import { ZIndex } from '@/constants';

import {
  getResizeHandleEdgeClass,
  getResizeHandleGripLineClasses,
  getResizeHandleGripOffsetClass,
  getResizeHandleHitAreaOffsetClass,
  getResizeHandleHoverBackgroundClasses,
  getResizeHandleInlineGripOpacityClass,
  getResizeHandleRoundedClass,
  getResizeHandleVisualVisibilityClass,
  RESIZE_HANDLE_VISUAL_TRANSITION_CLASS,
  type ResizeHandleCornerStyle,
  type TaskBarResizeHandleInlinePaint,
} from './taskBarResizeHandleHelpers';

type ResizeHandleColors = ReturnType<typeof getResizeHandleColors>;

interface TaskBarResizeHandleActiveProps {
  cornerStyle?: ResizeHandleCornerStyle;
  hoverBgClass: string;
  hoverBgClassDark: string;
  isActive: boolean;
  paint?: TaskBarResizeHandleInlinePaint;
  resizeHandleColors: ResizeHandleColors;
  side: 'left' | 'right';
  title: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function TaskBarResizeHandleActive({
  cornerStyle = 'rounded',
  hoverBgClass,
  hoverBgClassDark,
  isActive,
  onMouseDown,
  paint,
  resizeHandleColors,
  side,
  title,
}: TaskBarResizeHandleActiveProps) {
  const edgeClass = getResizeHandleEdgeClass(side);
  const visualVisibilityClass = getResizeHandleVisualVisibilityClass(isActive);
  const backgroundClass = paint
    ? ''
    : getResizeHandleHoverBackgroundClasses(
        isActive,
        resizeHandleColors,
        hoverBgClass,
        hoverBgClassDark
      );
  const gripLineClass = paint
    ? getResizeHandleInlineGripOpacityClass(isActive)
    : getResizeHandleGripLineClasses(isActive, resizeHandleColors);

  return (
    <div
      className={`task-bar-resize-handle-hit absolute ${edgeClass} top-0 bottom-0 w-6 cursor-ew-resize group/resize-handle ${ZIndex.class('arrowsHovered')}`}
      // Inline zIndex: гарантирует корректное наложение в swimlane,
      // t.к. z-[...] классы иногда не попадают в Tailwind build.
      style={{
        touchAction: 'none',
        pointerEvents: 'auto',
        zIndex: ZIndex.value('arrowsHovered'),
      }}
      title={title}
      onMouseDown={onMouseDown}
    >
      <div
        className={`absolute inset-0 ${RESIZE_HANDLE_VISUAL_TRANSITION_CLASS} ${visualVisibilityClass}`}
      >
        <div
          className={`absolute inset-0 ${getResizeHandleRoundedClass(side, cornerStyle)} transition-all ${backgroundClass}`}
          style={paint ? { backgroundColor: paint.background } : undefined}
        />

        <div
          className={`absolute ${getResizeHandleGripOffsetClass(side)} top-1/2 -translate-y-1/2 flex flex-col gap-0.5`}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-0.5 h-3 rounded transition-all ${gripLineClass}`}
              style={paint ? { backgroundColor: paint.line } : undefined}
            />
          ))}
        </div>
      </div>

      <div className={`absolute inset-0 ${getResizeHandleHitAreaOffsetClass(side)}`} />
    </div>
  );
}
