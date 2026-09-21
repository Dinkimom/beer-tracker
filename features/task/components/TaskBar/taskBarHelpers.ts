import type { Task, TaskPosition } from '@/types';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { CSSProperties } from 'react';

import { CARD_MARGIN, ZIndex } from '@/constants';
import { SWIMLANE_TASK_ROW_VERTICAL_INSET_PX } from '@/features/swimlane/utils/taskLayerTaskLayout';

const TASK_BAR_LONG_HOVER_EXPAND_MAX_DURATION_PARTS = 5;
const TASK_BAR_EXPANDED_MIN_DURATION_PARTS = 4;

export function resolveTaskBarDragActivationProps(params: {
  attributes: DraggableAttributes;
  inlineTitleEditor?: unknown;
  interactionDisabled: boolean;
  isResizing: boolean;
  listeners?: SyntheticListenerMap;
}): DraggableAttributes & SyntheticListenerMap {
  const { attributes, inlineTitleEditor, interactionDisabled, isResizing, listeners } = params;
  if (isResizing || interactionDisabled) return {} as DraggableAttributes & SyntheticListenerMap;
  if (inlineTitleEditor) {
    const { onKeyDown: _onKeyDown, onKeyUp: _onKeyUp, ...pointerListeners } = listeners ?? {};
    return { ...pointerListeners, ...attributes } as DraggableAttributes & SyntheticListenerMap;
  }
  return { ...listeners, ...attributes } as DraggableAttributes & SyntheticListenerMap;
}

export function resolveTaskBarDisplayDimensions(params: {
  isResizing: boolean;
  leftPercent: number;
  resizePreviewDuration: number | null;
  resizePreviewStartCell: number | null;
  swimlaneTimelineTotalParts: number;
  widthPercent: number;
}): { displayLeftPercent: number; displayWidthPercent: number } {
  const displayWidthPercent =
    params.isResizing && params.resizePreviewDuration !== null
      ? (params.resizePreviewDuration / params.swimlaneTimelineTotalParts) * 100
      : params.widthPercent;
  const displayLeftPercent =
    params.isResizing && params.resizePreviewStartCell !== null
      ? (params.resizePreviewStartCell / params.swimlaneTimelineTotalParts) * 100
      : params.leftPercent;
  return { displayLeftPercent, displayWidthPercent };
}

export function resolveTaskBarLongHoverExpand(params: {
  duration: number;
  effectiveIsDragging: boolean;
  isDraftTask: boolean;
  isExpandedByLongHover: boolean;
  isLinking?: boolean;
  isPhotoCard?: boolean;
  isResizing: boolean;
  swimlaneBarDurationParts?: number;
  swimlaneTimelineTotalParts: number;
}): {
  expandedMinWidthPercent: number;
  isNarrowForLongHoverExpand: boolean;
  shouldExpandByLongHover: boolean;
} {
  const barDurationParts = params.swimlaneBarDurationParts ?? params.duration;
  const isNarrowForLongHoverExpand =
    !params.isDraftTask &&
    !params.isPhotoCard &&
    barDurationParts <= TASK_BAR_LONG_HOVER_EXPAND_MAX_DURATION_PARTS;
  const shouldExpandByLongHover =
    params.isExpandedByLongHover &&
    isNarrowForLongHoverExpand &&
    !params.effectiveIsDragging &&
    !params.isLinking &&
    !params.isResizing;
  const expandedMinWidthPercent =
    (TASK_BAR_EXPANDED_MIN_DURATION_PARTS / params.swimlaneTimelineTotalParts) * 100;
  return { isNarrowForLongHoverExpand, shouldExpandByLongHover, expandedMinWidthPercent };
}

export function resolveTaskBarContentLayout(params: {
  durationParts: number;
  displayWidthPercent: number;
  expandedMinWidthPercent: number;
  shouldExpandByLongHover: boolean;
}): { contentDurationParts: number; contentWidthPercent: number } {
  if (!params.shouldExpandByLongHover) {
    return {
      contentDurationParts: params.durationParts,
      contentWidthPercent: params.displayWidthPercent,
    };
  }
  return {
    contentDurationParts: Math.max(params.durationParts, TASK_BAR_EXPANDED_MIN_DURATION_PARTS),
    contentWidthPercent: Math.max(params.displayWidthPercent, params.expandedMinWidthPercent),
  };
}

export function buildTaskBarWidthCss(
  displayWidthPercent: number,
  expandedMinWidthPercent: number
): { baseWidthCss: string; expandedWidthCss: string } {
  const baseWidthCss = `calc(${displayWidthPercent}% - ${CARD_MARGIN * 2}px)`;
  const expandedWidthPercent = Math.max(displayWidthPercent, expandedMinWidthPercent);
  const expandedWidthCss = `calc(${expandedWidthPercent}% - ${CARD_MARGIN * 2}px)`;
  return { baseWidthCss, expandedWidthCss };
}

/** Горизонтальная геометрия карточки задачи на таймлайне свимлейна. */
export function buildSwimlaneTaskBarHorizontalStyle(params: {
  durationCells: number;
  startCell: number;
  timelineTotalParts: number;
}): Pick<CSSProperties, 'left' | 'width'> {
  const startPercent = (params.startCell / params.timelineTotalParts) * 100;
  const widthPercent = (params.durationCells / params.timelineTotalParts) * 100;
  return {
    left: `calc(${startPercent}% + ${CARD_MARGIN}px)`,
    width: `calc(${widthPercent}% - ${CARD_MARGIN * 2}px)`,
  };
}

/**
 * Overdue-baseline: продолжение от правого края карточки (startCell = конец плана).
 * Ширина — только доля таймлайна; правый край совпадает с карточкой, заканчивающейся в той же ячейке.
 */
export function buildSwimlaneOverdueBaselineStripHorizontalStyle(params: {
  durationCells: number;
  startCell: number;
  timelineTotalParts: number;
}): Pick<CSSProperties, 'left' | 'width'> {
  const startPercent = (params.startCell / params.timelineTotalParts) * 100;
  const widthPercent = (params.durationCells / params.timelineTotalParts) * 100;
  return {
    left: `calc(${startPercent}% - ${CARD_MARGIN}px)`,
    width: `calc(${widthPercent}%)`,
  };
}

/** Класс из globals.css: гасит анимацию ширины `.task-bar-item` на время ресайза/оверлея. */
export const TASK_BAR_INSTANT_GEOMETRY_CLASS = 'task-bar-item-instant-geometry';

export function resolveTaskBarInstantGeometryClass(params: {
  hideSourceForOverlay: boolean;
  isResizing: boolean;
}): string {
  return params.hideSourceForOverlay || params.isResizing ? TASK_BAR_INSTANT_GEOMETRY_CLASS : '';
}

export function scaleTaskBarHeightByDuration(
  height: CSSProperties['height'],
  durationParts: number,
  committedDurationParts = 1
): string | undefined {
  if (typeof height !== 'string' || !height.endsWith('px')) {
    return undefined;
  }
  const currentHeightPx = Number.parseFloat(height);
  if (!Number.isFinite(currentHeightPx) || currentHeightPx <= 0) {
    return undefined;
  }
  const committed = Math.max(1, committedDurationParts);
  const preview = Math.max(1, durationParts);
  return `${(currentHeightPx / committed) * preview}px`;
}

export function buildTaskBarLayoutStyle(params: {
  baseWidthCss: string;
  committedHeightDurationParts?: number;
  customStyleLayout: CSSProperties;
  displayLeftPercent: number;
  expandedWidthCss: string;
  hideSourceForOverlay: boolean;
  scaleHeightByDurationParts?: number;
  shouldExpandByLongHover: boolean;
  transformCss?: string;
}): CSSProperties {
  const layout: CSSProperties = {
    left: `calc(${params.displayLeftPercent}% + ${CARD_MARGIN}px)`,
    width: params.shouldExpandByLongHover ? params.expandedWidthCss : params.baseWidthCss,
    top: `${SWIMLANE_TASK_ROW_VERTICAL_INSET_PX}px`,
    bottom: `${SWIMLANE_TASK_ROW_VERTICAL_INSET_PX}px`,
    transform: params.hideSourceForOverlay ? undefined : params.transformCss,
    ...params.customStyleLayout,
  };
  if (layout.height != null) {
    layout.bottom = 'auto';
  }
  if (params.scaleHeightByDurationParts != null) {
    const scaledHeight = scaleTaskBarHeightByDuration(
      layout.height,
      params.scaleHeightByDurationParts,
      params.committedHeightDurationParts
    );
    if (scaledHeight) {
      layout.height = scaledHeight;
    }
  }
  return layout;
}

export function resolveHasQaTaskInSwimlane(params: {
  isQATask: boolean;
  qaTasksMap?: Map<string, Task>;
  task: Task;
  taskPositions?: Map<string, TaskPosition>;
}): boolean {
  if (!params.taskPositions || !params.qaTasksMap || params.isQATask) return false;
  const qaTask = params.qaTasksMap.get(params.task.id);
  return qaTask ? params.taskPositions.has(qaTask.id) : false;
}

function taskMatchesGlobalNameFilter(task: Task, globalNameFilter?: string): boolean {
  if (!globalNameFilter) return true;
  const needle = globalNameFilter.trim().toLowerCase();
  return task.name.toLowerCase().includes(needle) || task.id.toLowerCase().includes(needle);
}

export function resolveTaskBarEffectiveOpacity(params: {
  contextMenuBlurOtherCards: boolean;
  contextMenuTaskId: string | null;
  customStyleOpacity?: number;
  globalNameFilter?: string;
  task: Task;
}): number {
  const matchesFilter = taskMatchesGlobalNameFilter(params.task, params.globalNameFilter);
  const taskOpacity = matchesFilter ? 1 : 0.3;
  const opacityFromParent = params.customStyleOpacity ?? 1;
  const dimmedByContextMenuElsewhere =
    params.contextMenuBlurOtherCards &&
    params.contextMenuTaskId != null &&
    params.contextMenuTaskId !== params.task.id;
  return opacityFromParent * taskOpacity * (dimmedByContextMenuElsewhere ? 0.5 : 1);
}

export function resolveTaskBarZIndex(params: {
  effectiveIsDragging: boolean;
  inlineTitleEditor?: unknown;
  isInError: boolean;
  isPhotoCard?: boolean;
  isStickyNote?: boolean;
  quickAddMenu?: unknown;
  shouldExpandByLongHover: boolean;
}): number {
  if (params.effectiveIsDragging) return ZIndex.dragPreview;
  if (params.quickAddMenu || params.inlineTitleEditor) return ZIndex.floatingControls;
  if (params.shouldExpandByLongHover) return ZIndex.arrowsHovered;
  if (params.isStickyNote || params.isPhotoCard) return ZIndex.stickyNote;
  if (params.isInError) return ZIndex.stickyElevated;
  return ZIndex.stickyInContent;
}

export function shouldStartLongHoverExpand(params: {
  effectiveIsDragging: boolean;
  isDraftTask: boolean;
  isLinking?: boolean;
  isNarrowForLongHoverExpand: boolean;
  isResizing: boolean;
}): boolean {
  return (
    !params.isDraftTask &&
    params.isNarrowForLongHoverExpand &&
    !params.effectiveIsDragging &&
    !params.isLinking &&
    !params.isResizing
  );
}

/** Не схлопывать long-hover, пока открыто меню этой карточки, курсор над ней или над крестиком связи. */
export function shouldCollapseTaskBarLongHoverExpand(params: {
  contextMenuOpenForThis: boolean;
  isHoveredSource?: boolean;
  isPointerOverCard: boolean;
  isPointerOverLinkDeleteHandle?: boolean;
}): boolean {
  if (params.contextMenuOpenForThis) return false;
  if (params.isHoveredSource) return false;
  if (params.isPointerOverLinkDeleteHandle) return false;
  return !params.isPointerOverCard;
}

export function shouldHandleTaskBarClick(params: {
  clickStartPos: { x: number; y: number } | null;
  clientX: number;
  clientY: number;
  effectiveIsDragging: boolean;
  isResizing: boolean;
  target: HTMLElement;
}): boolean {
  if (!params.clickStartPos || params.effectiveIsDragging || params.isResizing) return false;
  const deltaX = Math.abs(params.clientX - params.clickStartPos.x);
  const deltaY = Math.abs(params.clientY - params.clickStartPos.y);
  if (deltaX >= 5 || deltaY >= 5) return false;
  return !params.target.closest('a');
}

export function shouldCancelInlineEditorOnFocusOut<T>(params: {
  currentTarget: { contains: (node: T) => boolean } | null;
  persistDraft?: boolean;
  relatedTarget: T | null;
}): boolean {
  if (params.persistDraft) {
    return false;
  }
  const root = params.currentTarget;
  if (root == null) {
    return false;
  }
  const next = params.relatedTarget;
  if (next == null) {
    return true;
  }
  return !root.contains(next);
}

export function isDimmedByContextMenuElsewhere(params: {
  contextMenuBlurOtherCards: boolean;
  contextMenuTaskId: string | null;
  taskId: string;
}): boolean {
  return (
    params.contextMenuBlurOtherCards &&
    params.contextMenuTaskId != null &&
    params.contextMenuTaskId !== params.taskId
  );
}
