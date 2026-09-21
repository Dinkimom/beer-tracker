'use client';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import {
  isTaskBarVerticalResizeHandleActive,
  resolveTaskBarResizeHandleInlinePaint,
  resolveTaskBarResizeHandleColors,
  resolveTaskBarVerticalResizeHandleTitle,
  type ResizeHandleCornerStyle,
} from './taskBarResizeHandleHelpers';
import { TaskBarVerticalResizeHandleActive } from './TaskBarVerticalResizeHandleActive';

interface TaskBarVerticalResizeHandleProps {
  cornerStyle?: ResizeHandleCornerStyle;
  isDraftTask?: boolean;
  isQATask: boolean;
  isResizing: boolean;
  originalStatus?: string;
  resizeSide: 'bottom' | 'top' | null;
  side: 'bottom' | 'top';
  statusColorKey?: string;
  stickyNoteColor?: string | null;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function TaskBarVerticalResizeHandle({
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
}: TaskBarVerticalResizeHandleProps) {
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
  const isActive = isTaskBarVerticalResizeHandleActive(isResizing, resizeSide, side);
  const paint = resolveTaskBarResizeHandleInlinePaint(
    cornerStyle,
    isDark,
    isActive,
    stickyNoteColor
  );

  return (
    <TaskBarVerticalResizeHandleActive
      cornerStyle={cornerStyle}
      hoverBgClass={hoverBgClass}
      hoverBgClassDark={hoverBgClassDark}
      isActive={isActive}
      paint={paint}
      resizeHandleColors={resizeHandleColors}
      side={side}
      title={resolveTaskBarVerticalResizeHandleTitle(side, t)}
      onMouseDown={onMouseDown}
    />
  );
}
