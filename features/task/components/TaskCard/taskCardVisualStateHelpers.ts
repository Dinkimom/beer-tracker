import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant, TaskPosition } from '@/types';
import type { CSSProperties } from 'react';

import { getStickyNoteCardStyle } from '@/features/comments/utils/stickyNotePalette';
import { isSwimlaneCommentTask, isSwimlaneDiagramTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { getDiagramCardStyle } from '@/features/task/utils/diagramCardSurface';
import { getPhotoCardPaddingClass, getPhotoCardStyle } from '@/features/task/utils/photoCardSurface';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import {
  getPhaseDividerClasses,
  getQaStripedStyles,
  getStatusColors,
  resolveStatusForPhaseCardColors,
} from '@/utils/statusColors';

import { getTaskCardStyles } from './components/taskCardBodyStyleHelpers';
import {
  computeTaskCardBarMetrics,
  getDimmedByContextMenuClasses,
  getLocalTaskCardSurfaceClasses,
  getQaRightBgColor,
  getSidebarOpacityGroupClasses,
  getSwimlaneCardRadiusClass,
  getSwimlaneWidthModes,
  getTaskCardBorderClasses,
  getTaskCardCursorClass,
  getTaskCardPaddingClasses,
} from './taskCardLayoutHelpers';
import {
  buildTaskCardHoverShadowClasses,
  buildTaskCardRingClasses,
  buildTaskCardRootClassName,
  resolveTaskCardContextMenuBorderClasses,
  resolveTaskCardHoverGlowColor,
  resolveTaskCardQaStripedStyle,
  resolveTaskCardSwimlaneFields,
  withTaskCardHoverGlowStyle,
} from './taskCardRenderHelpers';

function resolvePlannerAnnotationCardStyle(
  isLocalDiagramCard: boolean,
  isLocalImageCard: boolean,
  isLocalCommentDraft: boolean,
  stickyNoteColor: string | null | undefined,
  isDark: boolean
): CSSProperties | undefined {
  if (isLocalDiagramCard) {
    return getDiagramCardStyle(isDark);
  }
  if (isLocalImageCard) {
    return getPhotoCardStyle(isDark);
  }
  if (isLocalCommentDraft) {
    return getStickyNoteCardStyle(stickyNoteColor, isDark);
  }
  return undefined;
}

function resolveTaskCardPaddingClassesForAnnotation(
  isLocalImageCard: boolean,
  isLocalCommentDraft: boolean,
  hasFooter: boolean,
  isVeryNarrow: boolean,
  isNarrow: boolean,
  isSwimlane: boolean
): string {
  if (isLocalImageCard) {
    return getPhotoCardPaddingClass(hasFooter);
  }
  if (isLocalCommentDraft) {
    return '';
  }
  return getTaskCardPaddingClasses(isVeryNarrow, isNarrow, isSwimlane);
}

function resolveTaskCardLocalSurface(
  effectiveIsLocalTask: boolean,
  isLocalCommentDraft: boolean,
  isLocalImageCard: boolean,
  cardStyles: ReturnType<typeof getTaskCardStyles>
) {
  return {
    cardBorderColorClasses: effectiveIsLocalTask ? '' : cardStyles.teamBorder,
    cardSurfaceClasses: effectiveIsLocalTask
      ? getLocalTaskCardSurfaceClasses(isLocalCommentDraft, isLocalImageCard)
      : cardStyles.teamColor,
  };
}

function resolveTaskCardQaVisualExtras(
  isQATask: boolean,
  statusForCardColors: string | undefined,
  isDark: boolean
) {
  if (!isQATask) {
    return { qaRightBgColor: undefined, qaStripedStyle: undefined };
  }
  const statusColorsForQa = getStatusColors(statusForCardColors);
  const { style: qaStripedStyle } = getQaStripedStyles(statusForCardColors, isDark);
  return {
    qaRightBgColor: getQaRightBgColor(statusColorsForQa, isDark),
    qaStripedStyle,
  };
}

function resolveTaskCardSurfaceState(input: {
  effectiveIsLocalTask: boolean;
  isLocalCommentDraft: boolean;
  isLocalImageCard: boolean;
  isQATask: boolean;
  isDark: boolean;
  showExtraSplit: boolean;
  statusForCardColors: string | undefined;
  task: Task;
  variant: TaskCardVariant;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
}) {
  const cardStyles = getTaskCardStyles(input.task, input.variant, input.phaseCardColorScheme);
  const { cardBorderColorClasses, cardSurfaceClasses } = resolveTaskCardLocalSurface(
    input.effectiveIsLocalTask,
    input.isLocalCommentDraft,
    input.isLocalImageCard,
    cardStyles
  );
  const dividerBgClass = input.showExtraSplit
    ? getPhaseDividerClasses(input.statusForCardColors, input.isQATask)
    : '';
  const { qaRightBgColor, qaStripedStyle } = resolveTaskCardQaVisualExtras(
    input.isQATask,
    input.statusForCardColors,
    input.isDark
  );

  return {
    cardBorderColorClasses,
    cardStyles,
    cardSurfaceClasses,
    dividerBgClass,
    qaRightBgColor,
    qaStripedStyle,
  };
}

function buildTaskCardRootVisualState(input: {
  borderClasses: string;
  cardBorderColorClasses: string;
  cardSurfaceClasses: string;
  className: string;
  cursorClass: string;
  dimmedByContextMenu: boolean;
  effectiveIsLocalTask: boolean;
  isContextMenuOpen: boolean;
  isDragging: boolean;
  isLocalCommentDraft: boolean;
  isLocalDiagramCard: boolean;
  isLocalImageCard: boolean;
  isQATask: boolean;
  isResizing: boolean;
  isSelected: boolean;
  isNotificationFocused?: boolean;
  linkingActive?: boolean;
  isSwimlane: boolean;
  paddingClasses: string;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  qaStripedStyle: CSSProperties | undefined;
  showExtraSplit: boolean;
  stickyNoteColor?: string | null;
  isDark: boolean;
  task: Task;
  variant: TaskCardVariant;
}) {
  const qaStyle = resolveTaskCardQaStripedStyle({
    isQATask: input.isQATask,
    qaStripedStyle: input.qaStripedStyle,
    showExtraSplit: input.showExtraSplit,
    variant: input.variant,
  });
  const annotationStyle = resolvePlannerAnnotationCardStyle(
    input.isLocalDiagramCard,
    input.isLocalImageCard,
    input.isLocalCommentDraft,
    input.stickyNoteColor,
    input.isDark
  );
  const radiusClass = getSwimlaneCardRadiusClass(input.isLocalImageCard, input.isLocalCommentDraft);
  const glowColor = resolveTaskCardHoverGlowColor({
    isDark: input.isDark,
    isLocalCommentDraft: input.isLocalCommentDraft,
    isLocalDiagramCard: input.isLocalDiagramCard,
    isLocalImageCard: input.isLocalImageCard,
    phaseCardColorScheme: input.phaseCardColorScheme,
    stickyNoteColor: input.stickyNoteColor,
    task: input.task,
  });
  return {
    cardRootClassName: buildTaskCardRootClassName({
      borderClasses: input.borderClasses,
      cardBorderColorClasses: input.cardBorderColorClasses,
      cardSurfaceClasses: input.cardSurfaceClasses,
      className: input.className,
      contextMenuBorderClasses: resolveTaskCardContextMenuBorderClasses(
        input.isContextMenuOpen,
        input.isLocalImageCard || input.isLocalDiagramCard
      ),
      contextMenuZClasses: input.isContextMenuOpen ? 'relative z-20' : '',
      cursorClass: input.cursorClass,
      dimmedClasses: input.dimmedByContextMenu ? getDimmedByContextMenuClasses(input.isSwimlane) : '',
      hoverShadowClasses: buildTaskCardHoverShadowClasses(
        input.effectiveIsLocalTask,
        input.isDragging,
        input.isResizing,
        input.linkingActive,
        input.isLocalCommentDraft
      ),
      isResizing: input.isResizing,
      paddingClasses: input.paddingClasses,
      radiusClass,
      ringClasses: buildTaskCardRingClasses(
        input.isSelected,
        input.isContextMenuOpen,
        input.isNotificationFocused
      ),
      sidebarOpacityClasses: getSidebarOpacityGroupClasses(input.variant, input.dimmedByContextMenu),
      sizeVariantClasses: input.isSwimlane ? 'h-full min-h-[56px]' : 'min-h-[130px]',
    }),
    cardRootStyle: withTaskCardHoverGlowStyle({ ...qaStyle, ...annotationStyle }, glowColor),
  };
}

export function buildTaskCardVisualState(input: {
  className: string;
  dimmedByContextMenu: boolean;
  isContextMenuOpen: boolean;
  isDark: boolean;
  isDragging: boolean;
  isLocalTask: boolean;
  isLocked?: boolean;
  isQATask: boolean;
  isResizing: boolean;
  isSelected: boolean;
  isNotificationFocused?: boolean;
  linkMode?: 'source' | 'target' | null;
  linkingActive?: boolean;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  previewBorder?: string;
  resizePreviewDuration?: number | null;
  showExtraSplit: boolean;
  statusForCardColors: string | undefined;
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
  task: Task;
  variant: TaskCardVariant;
  widthPercent?: number;
}) {
  const isSwimlane = input.variant === 'swimlane';
  const { isNarrow, isVeryNarrow } = getSwimlaneWidthModes(isSwimlane, input.widthPercent);
  const isLocalCommentDraft = isSwimlaneCommentTask(input.task);
  const isLocalDiagramCard = isSwimlaneDiagramTask(input.task);
  const isLocalImageCard = isSwimlaneImageTask(input.task);
  const isLocalPhotoOrDiagramCard = isLocalImageCard || isLocalDiagramCard;
  const effectiveIsLocalTask =
    isLocalCommentDraft ||
    isLocalPhotoOrDiagramCard ||
    input.isLocalTask ||
    input.task.isLocalTask === true;

  const paddingClasses = resolveTaskCardPaddingClassesForAnnotation(
    isLocalPhotoOrDiagramCard,
    isLocalCommentDraft,
    Boolean(input.task.name?.trim()),
    isVeryNarrow,
    isNarrow,
    isSwimlane
  );
  const cursorClass = getTaskCardCursorClass(input.isDragging, input.isResizing, input.isLocked, {
    linkMode: input.linkMode,
    linkingActive: input.linkingActive,
  });
  const borderClasses = getTaskCardBorderClasses(
    input.previewBorder,
    input.isResizing,
    effectiveIsLocalTask,
    isLocalCommentDraft,
    isLocalPhotoOrDiagramCard
  );
  const {
    cardBorderColorClasses,
    cardStyles,
    cardSurfaceClasses,
    dividerBgClass,
    qaRightBgColor,
    qaStripedStyle,
  } = resolveTaskCardSurfaceState({
    effectiveIsLocalTask,
    isDark: input.isDark,
    isLocalCommentDraft,
    isLocalImageCard: isLocalPhotoOrDiagramCard,
    isQATask: input.isQATask,
    phaseCardColorScheme: input.phaseCardColorScheme,
    showExtraSplit: input.showExtraSplit,
    statusForCardColors: input.statusForCardColors,
    task: input.task,
    variant: input.variant,
  });

  const { cardRootClassName, cardRootStyle } = buildTaskCardRootVisualState({
    borderClasses,
    cardBorderColorClasses,
    cardSurfaceClasses,
    className: input.className,
    cursorClass,
    dimmedByContextMenu: input.dimmedByContextMenu,
    effectiveIsLocalTask,
    isContextMenuOpen: input.isContextMenuOpen,
    isDark: input.isDark,
    isDragging: input.isDragging,
    isLocalCommentDraft,
    isLocalDiagramCard,
    isLocalImageCard: isLocalPhotoOrDiagramCard,
    isQATask: input.isQATask,
    isResizing: input.isResizing,
    isSelected: input.isSelected,
    isNotificationFocused: input.isNotificationFocused,
    linkingActive: input.linkingActive,
    isSwimlane,
    paddingClasses,
    phaseCardColorScheme: input.phaseCardColorScheme,
    qaStripedStyle,
    showExtraSplit: input.showExtraSplit,
    stickyNoteColor: input.task.stickyNoteColor,
    task: input.task,
    variant: input.variant,
  });

  return {
    cardRootClassName,
    cardRootStyle,
    cardStyles,
    dividerBgClass,
    isNarrow,
    isSwimlane,
    isVeryNarrow,
    paddingClasses,
    qaRightBgColor,
    qaStripedStyle,
    resolvedSwimlaneCardFields: resolveTaskCardSwimlaneFields(isSwimlane, input.swimlaneCardFields),
  };
}

export function useTaskCardBarMetrics(
  task: Task,
  taskPosition: TaskPosition | undefined,
  swimlaneBarDurationParts: number | undefined,
  resizePreviewDuration: number | null | undefined,
  isResizing: boolean
) {
  return computeTaskCardBarMetrics(
    task,
    taskPosition,
    swimlaneBarDurationParts,
    resizePreviewDuration,
    isResizing
  );
}

export function resolveTaskCardColorContext(
  task: Task,
  explicitIsQa: boolean | undefined,
  phaseCardColorScheme: PlanningPhaseCardColorScheme
) {
  const isQATask = explicitIsQa === true || isEffectivelyQaTask(task);
  const statusForCardColors = resolveStatusForPhaseCardColors(
    phaseCardColorScheme,
    task.originalStatus,
    task.statusColorKey
  );
  return { isQATask, statusForCardColors };
}
