/**
 * Компонент ручки изменения размера TaskBar
 *
 * Один стабильный DOM-узел: видимость грипа через CSS :hover (и isActive при ресайзе).
 * Раньше HoverZone ↔ Active перемонтировались по JS-isHovering — mouseLeave терялся,
 * и рукоятки «залипали» сразу на нескольких карточках.
 */

'use client';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import { TaskBarResizeHandleActive } from './TaskBarResizeHandleActive';
import {
  isTaskBarResizeHandleActive,
  resolveTaskBarResizeHandleInlinePaint,
  resolveTaskBarResizeHandleColors,
  resolveTaskBarResizeHandleTitle,
  type ResizeHandleCornerStyle,
} from './taskBarResizeHandleHelpers';

interface TaskBarResizeHandleProps {
  cornerStyle?: ResizeHandleCornerStyle;
  isDraftTask?: boolean;
  isQATask: boolean;
  isResizing: boolean;
  originalStatus?: string;
  resizeSide: 'left' | 'right' | null;
  side: 'left' | 'right';
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
  const paint = resolveTaskBarResizeHandleInlinePaint(
    cornerStyle,
    isDark,
    isActive,
    stickyNoteColor
  );

  return (
    <TaskBarResizeHandleActive
      cornerStyle={cornerStyle}
      hoverBgClass={hoverBgClass}
      hoverBgClassDark={hoverBgClassDark}
      isActive={isActive}
      paint={paint}
      resizeHandleColors={resizeHandleColors}
      side={side}
      title={resolveTaskBarResizeHandleTitle(side, t)}
      onMouseDown={onMouseDown}
    />
  );
}
