'use client';

import type { getResizeHandleColors } from '@/utils/statusColors';

import { RESIZE_HANDLE_TOOLTIP_DELAY_MS, TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';

import {
  getResizeHandleHoverBackgroundClasses,
  getResizeHandleInlineGripOpacityClass,
  getResizeHandleRoundedClass,
  getResizeHandleVerticalBackdropInsetClass,
  getResizeHandleVerticalEdgeClass,
  getResizeHandleVerticalGripLineSizeClass,
  getResizeHandleVerticalGripOffsetClass,
  getResizeHandleVerticalHeightClass,
  getResizeHandleVisualVisibilityClass,
  RESIZE_HANDLE_VISUAL_TRANSITION_CLASS,
  type ResizeHandleCornerStyle,
  type TaskBarResizeHandleInlinePaint,
} from './taskBarResizeHandleHelpers';
import { useResizeGripStepNudge } from './useResizeGripStepNudge';

type ResizeHandleColors = ReturnType<typeof getResizeHandleColors>;

interface TaskBarVerticalResizeHandleActiveProps {
  cornerStyle?: ResizeHandleCornerStyle;
  hoverBgClass: string;
  hoverBgClassDark: string;
  isActive: boolean;
  paint?: TaskBarResizeHandleInlinePaint;
  resizeHandleColors: ResizeHandleColors;
  /** Высота заметки в строках во время жеста — толчок грипа на каждой смене. */
  resizeStep?: number | null;
  side: 'bottom' | 'top';
  title: string;
  visualVisibilityClass?: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function TaskBarVerticalResizeHandleActive({
  cornerStyle = 'rounded',
  hoverBgClass,
  hoverBgClassDark,
  isActive,
  onMouseDown,
  paint,
  resizeHandleColors,
  resizeStep = null,
  side,
  title,
  visualVisibilityClass: visualVisibilityClassOverride,
}: TaskBarVerticalResizeHandleActiveProps) {
  const gripRef = useResizeGripStepNudge(resizeStep, 'y', side === 'bottom' ? 1 : -1);
  const edgeClass = getResizeHandleVerticalEdgeClass(side);
  const visualVisibilityClass =
    visualVisibilityClassOverride ?? getResizeHandleVisualVisibilityClass(isActive);
  const heightClass = getResizeHandleVerticalHeightClass(cornerStyle);
  const backdropInsetClass = getResizeHandleVerticalBackdropInsetClass();
  const gripLineSizeClass = getResizeHandleVerticalGripLineSizeClass(cornerStyle);
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
    : `${resizeHandleColors.line} ${resizeHandleColors.lineDark} ${getResizeHandleInlineGripOpacityClass(isActive)}`;

  return (
    <TextTooltip
      content={title}
      delayDuration={RESIZE_HANDLE_TOOLTIP_DELAY_MS}
      skipDelayDuration={0}
    >
      <div
        className={`task-bar-resize-handle-hit absolute left-0 right-0 ${edgeClass} ${heightClass} cursor-ns-resize group/resize-handle ${ZIndex.class('arrowsHovered')}`}
        style={{
          touchAction: 'none',
          pointerEvents: 'auto',
          zIndex: ZIndex.value('arrowsHovered'),
        }}
        onMouseDown={onMouseDown}
      >
        <div
          className={`absolute inset-0 ${RESIZE_HANDLE_VISUAL_TRANSITION_CLASS} ${visualVisibilityClass}`}
        >
          <div
            className={`task-bar-resize-handle-bg absolute ${backdropInsetClass} ${getResizeHandleRoundedClass(side === 'top' ? 'left' : 'right', cornerStyle)} transition-all ${backgroundClass}`}
            style={paint ? { backgroundColor: paint.background } : undefined}
          />

          <div
            ref={gripRef}
            className={`absolute left-1/2 -translate-x-1/2 ${getResizeHandleVerticalGripOffsetClass(side, cornerStyle)} flex flex-row gap-px`}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`task-bar-resize-grip-line--vertical h-0.5 ${gripLineSizeClass} rounded transition-all ${gripLineClass}`}
                style={paint ? { backgroundColor: paint.line } : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </TextTooltip>
  );
}
