'use client';

import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant, TaskPosition } from '@/types';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import {
  buildTaskCardVisualState,
  resolveTaskCardColorContext,
  useTaskCardBarMetrics,
} from './taskCardVisualStateHelpers';

export function useTaskCardVisualState(input: {
  className: string;
  dimmedByContextMenu: boolean;
  isContextMenuOpen: boolean;
  isDragging: boolean;
  isLocalTask: boolean;
  isLocked?: boolean;
  isQATask?: boolean;
  isResizing: boolean;
  isSelected: boolean;
  isNotificationFocused?: boolean;
  linkMode?: 'source' | 'target' | null;
  linkingActive?: boolean;
  previewBorder?: string;
  resizePreviewDuration?: number | null;
  swimlaneBarDurationParts?: number;
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
  task: Task;
  taskPosition?: TaskPosition;
  variant: TaskCardVariant;
  widthPercent?: number;
}) {
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const isDark = useDocumentDarkClass();
  const isQATask = input.isQATask === true || isEffectivelyQaTask(input.task);
  const { statusForCardColors } = resolveTaskCardColorContext(
    input.task,
    input.isQATask,
    phaseCardColorScheme
  );
  const barMetrics = useTaskCardBarMetrics(
    input.task,
    input.taskPosition,
    input.swimlaneBarDurationParts,
    input.resizePreviewDuration,
    input.isResizing
  );

  const surface = buildTaskCardVisualState({
    className: input.className,
    dimmedByContextMenu: input.dimmedByContextMenu,
    isContextMenuOpen: input.isContextMenuOpen,
    isDark,
    isDragging: input.isDragging,
    isLocalTask: input.isLocalTask,
    isLocked: input.isLocked,
    isQATask,
    isResizing: input.isResizing,
    isSelected: input.isSelected,
    isNotificationFocused: input.isNotificationFocused,
    linkMode: input.linkMode,
    linkingActive: input.linkingActive,
    phaseCardColorScheme,
    previewBorder: input.previewBorder,
    resizePreviewDuration: input.resizePreviewDuration,
    showExtraSplit: barMetrics.showExtraSplit,
    statusForCardColors,
    swimlaneCardFields: input.swimlaneCardFields,
    task: input.task,
    variant: input.variant,
    widthPercent: input.widthPercent,
  });

  return {
    barMetrics,
    isDark,
    isQATask,
    phaseCardColorScheme,
    ...surface,
  };
}
