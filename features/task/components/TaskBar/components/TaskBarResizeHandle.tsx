/**
 * Компонент ручки изменения размера TaskBar: слева/справа — длительность, снизу — высота заметки.
 *
 * Один стабильный DOM-узел: видимость грипа через CSS :hover (и isActive при ресайзе).
 * Раньше HoverZone ↔ Active перемонтировались по JS-isHovering — mouseLeave терялся,
 * и рукоятки «залипали» сразу на нескольких карточках.
 */

'use client';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { RESIZE_HANDLE_TOOLTIP_DELAY_MS, TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import {
  getResizeHandleGripLineClasses,
  getResizeHandleHoverBackgroundClasses,
  getResizeHandleInlineGripOpacityClass,
  getResizeHandleVisualVisibilityClass,
  isTaskBarResizeHandleActive,
  RESIZE_HANDLE_VISUAL_TRANSITION_CLASS,
  resolveTaskBarResizeHandleColors,
  resolveTaskBarResizeHandleInlinePaint,
  resolveTaskBarResizeHandleLayout,
  resolveTaskBarResizeHandleTitle,
  type ResizeHandleCornerStyle,
  type ResizeHandleSide,
} from './taskBarResizeHandleHelpers';
import { useResizeGripStepNudge } from './useResizeGripStepNudge';

interface TaskBarResizeHandleProps {
  cornerStyle?: ResizeHandleCornerStyle;
  isDraftTask?: boolean;
  isQATask: boolean;
  isResizing: boolean;
  originalStatus?: string;
  resizeSide: ResizeHandleSide | null;
  /** Шаг жеста: длительность в ячейках или высота заметки в строках (толчок грипа на смене). */
  resizeStep?: number | null;
  side: ResizeHandleSide;
  statusColorKey?: string;
  stickyNoteColor?: string | null;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function TaskBarResizeHandle({
  cornerStyle = 'rounded',
  isDraftTask = false,
  isQATask,
  isResizing,
  onMouseDown,
  originalStatus,
  resizeSide,
  resizeStep = null,
  side,
  statusColorKey,
  stickyNoteColor,
}: TaskBarResizeHandleProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const { hoverBgClass, hoverBgClassDark, resizeHandleColors } = resolveTaskBarResizeHandleColors({
    isDraftTask,
    isQATask,
    originalStatus,
    phaseCardColorScheme,
    statusColorKey,
  });
  const isActive = isTaskBarResizeHandleActive(isResizing, resizeSide, side);
  const paint = resolveTaskBarResizeHandleInlinePaint(cornerStyle, isDark, isActive, stickyNoteColor);
  const layout = resolveTaskBarResizeHandleLayout(side, cornerStyle);
  const gripRef = useResizeGripStepNudge(
    isActive ? resizeStep : null,
    layout.nudgeAxis,
    layout.nudgeDirection
  );
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
    <TextTooltip
      content={resolveTaskBarResizeHandleTitle(side, t)}
      delayDuration={RESIZE_HANDLE_TOOLTIP_DELAY_MS}
      skipDelayDuration={0}
    >
      <div
        className={`task-bar-resize-handle-hit absolute ${layout.hitClass} group/resize-handle ${ZIndex.class('arrowsHovered')}`}
        // Inline zIndex: гарантирует корректное наложение в swimlane,
        // t.к. z-[...] классы иногда не попадают в Tailwind build.
        style={{
          touchAction: 'none',
          pointerEvents: 'auto',
          zIndex: ZIndex.value('arrowsHovered'),
        }}
        onMouseDown={onMouseDown}
      >
        <div
          className={`absolute inset-0 ${RESIZE_HANDLE_VISUAL_TRANSITION_CLASS} ${getResizeHandleVisualVisibilityClass(isActive)}`}
        >
          <div
            className={`task-bar-resize-handle-bg absolute ${layout.backgroundClass} transition-all ${backgroundClass}`}
            style={paint ? { backgroundColor: paint.background } : undefined}
          />

          <div ref={gripRef} className={`absolute ${layout.gripClass}`}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`${layout.gripLineClass} rounded transition-all ${gripLineClass}`}
                style={paint ? { backgroundColor: paint.line } : undefined}
              />
            ))}
          </div>
        </div>

        {layout.hitOverhangClass ? (
          <div className={`absolute inset-0 ${layout.hitOverhangClass}`} />
        ) : null}
      </div>
    </TextTooltip>
  );
}
