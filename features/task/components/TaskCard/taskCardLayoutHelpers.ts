import type { Task, TaskPosition } from '@/types';
import type { StatusColorGroup } from '@/utils/statusColors';

import {
  getStickyNoteLocalDraftBorderClasses,
  getStickyNoteLocalDraftSurfaceClasses,
} from '@/features/comments/utils/stickyNoteSurfaceClasses';
import { getPhotoCardSurfaceClasses } from '@/features/task/utils/photoCardSurface';
import { getTaskPoints } from '@/features/task/utils/taskUtils';
import { storyPointsToTimeslots, timeslotsToStoryPoints } from '@/lib/pointsUtils';

export function getTaskCardPaddingClasses(
  isVeryNarrow: boolean,
  isNarrow: boolean,
  isSwimlane: boolean
): string {
  if (isVeryNarrow) return 'px-1.5 py-2';
  if (isNarrow) return 'px-2 py-2';
  if (isSwimlane) return 'px-2.5 pb-1.5 pt-1.5';
  return 'px-2.5 pb-2.5 pt-2.5';
}

export function getTaskCardCursorClass(
  isDragging: boolean,
  isResizing: boolean,
  isLocked = false,
  linkCursor?: { linkMode?: 'source' | 'target' | null; linkingActive?: boolean }
): string {
  if (isDragging) return 'cursor-grabbing';
  if (isResizing) return 'cursor-ew-resize';
  if (isLocked) return 'cursor-not-allowed';
  if (linkCursor?.linkMode === 'target') return 'cursor-pointer';
  if (linkCursor?.linkingActive) return 'cursor-default';
  return 'cursor-grab';
}

export function getSwimlaneCardRadiusClass(isPhotoCard: boolean, isStickyNote: boolean): string {
  if (isPhotoCard) {
    return 'rounded-none';
  }
  if (isStickyNote) {
    return 'rounded-none';
  }
  return 'rounded-lg';
}

export function getTaskCardBorderClasses(
  previewBorder: string | undefined,
  isResizing: boolean,
  isLocalTask: boolean,
  isLocalCommentDraft = false,
  isLocalImageCard = false
): string {
  if (isLocalImageCard) {
    return '';
  }
  if (isLocalCommentDraft) {
    return getStickyNoteLocalDraftBorderClasses();
  }
  if (isLocalTask) return 'border-2 border-dashed border-blue-300 dark:border-blue-700';
  if (previewBorder && isResizing) return `border-2 border-dashed ${previewBorder}`;
  return 'border-2';
}

export function getLocalTaskCardSurfaceClasses(isLocalCommentDraft = false, isLocalImageCard = false): string {
  if (isLocalImageCard) {
    return getPhotoCardSurfaceClasses();
  }
  if (isLocalCommentDraft) {
    return getStickyNoteLocalDraftSurfaceClasses();
  }
  return 'bg-blue-50/70 text-blue-600 dark:bg-blue-900/25 dark:text-blue-300';
}

export function getQaRightBgColor(
  statusColorsForQa: StatusColorGroup | null,
  isDark: boolean
): string | undefined {
  if (!statusColorsForQa) return undefined;
  if (isDark && statusColorsForQa.qaStripedDark) {
    return statusColorsForQa.qaStripedDark.base;
  }
  return statusColorsForQa.qaStriped?.base;
}

export function getDimmedByContextMenuClasses(isSwimlane: boolean): string {
  if (isSwimlane) return 'pointer-events-none';
  return 'opacity-50 pointer-events-none transition-opacity duration-200';
}

export function getSidebarOpacityGroupClasses(
  variant: 'sidebar' | 'swimlane',
  dimmedByContextMenu: boolean
): string {
  if (variant !== 'sidebar') return '';
  const opacityPart = !dimmedByContextMenu ? 'opacity-80 ' : '';
  return `${opacityPart}group`;
}

interface TaskCardBarMetrics {
  actualDuration: number;
  baselineSP: number;
  baselineTimeslots: number;
  estimatedSP: number;
  estimatedTimeslots: number;
  extraSP: number;
  extraTimeslots: number;
  hasExtraDuration: boolean;
  leftPercent: number;
  rightPercent: number;
  showExtraSplit: boolean;
}

export function computeTaskCardBarMetrics(
  task: Task,
  taskPosition: TaskPosition | undefined,
  swimlaneBarDurationParts: number | undefined,
  resizePreviewDuration: number | null | undefined,
  isResizing: boolean
): TaskCardBarMetrics {
  const estimatedSP = getTaskPoints(task);
  const estimatedTimeslots = storyPointsToTimeslots(estimatedSP);
  const planSlotsOnBar =
    swimlaneBarDurationParts ?? taskPosition?.duration ?? estimatedTimeslots;
  const actualDuration = resizePreviewDuration ?? planSlotsOnBar;
  // Заметка, схема и фото: width = duration в частях, без оценки SP — не показываем «+N» при resize.
  if (task.localDraftKind === 'comment' || task.localDraftKind === 'diagram' || task.localDraftKind === 'image') {
    return {
      actualDuration,
      baselineSP: 0,
      baselineTimeslots: actualDuration,
      estimatedSP: 0,
      estimatedTimeslots: 0,
      extraSP: 0,
      extraTimeslots: 0,
      hasExtraDuration: false,
      leftPercent: 100,
      rightPercent: 0,
      showExtraSplit: false,
    };
  }
  const committedSlots = planSlotsOnBar;
  const baselineTimeslots = Math.max(estimatedTimeslots, committedSlots);
  const baselineSP = Math.max(estimatedSP, timeslotsToStoryPoints(committedSlots));
  const extraTimeslots = Math.max(0, actualDuration - baselineTimeslots);
  const extraSP = Math.max(0, timeslotsToStoryPoints(actualDuration) - baselineSP);
  const hasExtraDuration = extraSP > 0;
  const showExtraSplit = hasExtraDuration && isResizing;
  const leftPercent =
    hasExtraDuration && actualDuration > 0 ? (baselineTimeslots / actualDuration) * 100 : 100;
  const rightPercent =
    hasExtraDuration && actualDuration > 0 ? (extraTimeslots / actualDuration) * 100 : 0;

  return {
    actualDuration,
    baselineSP,
    baselineTimeslots,
    estimatedSP,
    estimatedTimeslots,
    extraSP,
    extraTimeslots,
    hasExtraDuration,
    leftPercent,
    rightPercent,
    showExtraSplit,
  };
}

export function getSwimlaneWidthModes(
  isSwimlane: boolean,
  widthPercent: number | undefined
): { isNarrow: boolean; isVeryNarrow: boolean } {
  const isVeryNarrow = isSwimlane && widthPercent !== undefined && widthPercent < 10;
  const isNarrow = isSwimlane && widthPercent !== undefined && widthPercent < 15;
  return { isNarrow, isVeryNarrow };
}

export function isSwimlaneSingleTimeslotWidth(displayDuration: number | undefined): boolean {
  return displayDuration !== undefined && displayDuration <= 1;
}
