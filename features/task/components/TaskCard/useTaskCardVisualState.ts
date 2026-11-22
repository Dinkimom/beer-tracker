'use client';

import type { TaskCardSwimlaneProps } from './TaskCard';
import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant } from '@/types';

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
  /** Поля дорожки, от которых зависит вид: связи, фокус уведомления, ресайз, позиция. */
  swimlane?: Pick<
    TaskCardSwimlaneProps,
    'isNotificationFocused' | 'linkingActive' | 'linkMode' | 'resizePreviewDuration' | 'taskPosition'
  >;
  swimlaneBarDurationParts?: number;
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
  task: Task;
  variant: TaskCardVariant;
  widthPercent?: number;
}) {
  const {
    isNotificationFocused = false,
    linkMode = null,
    linkingActive = false,
    resizePreviewDuration,
    taskPosition,
  } = input.swimlane ?? {};
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
    taskPosition,
    input.swimlaneBarDurationParts,
    resizePreviewDuration,
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
    isNotificationFocused,
    linkMode,
    linkingActive,
    phaseCardColorScheme,
    resizePreviewDuration,
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

/** Вид карточки целиком: классы и стиль корня, цвета, ширина, метрики полосы — отдаётся телу одним объектом. */
export type TaskCardVisual = ReturnType<typeof useTaskCardVisualState>;
