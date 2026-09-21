import type { CSSProperties } from 'react';

import { CSS } from '@dnd-kit/utilities';

import { CARD_MARGIN, DEVELOPER_COLUMN_WIDTH } from '@/constants';
import { getWidthPercent } from '@/features/swimlane/utils/positionUtils';

export function shouldUseInitialDragWidth(widthPercent: number): boolean {
  return widthPercent === 10;
}

function computePreviewWidthFromSwimlane(activeTaskDuration: number): number | undefined {
  const swimlaneElement = document.querySelector('[data-swimlane]') as HTMLElement | null;
  if (!swimlaneElement) return undefined;

  const swimlaneRect = swimlaneElement.getBoundingClientRect();
  const swimlaneWidth = swimlaneRect.width;
  if (swimlaneWidth <= 0) return undefined;

  const widthPercent = getWidthPercent(activeTaskDuration);
  return (swimlaneWidth * widthPercent) / 100 - CARD_MARGIN * 2;
}

type DraggableTaskViewMode = 'compact' | 'full' | undefined;

function computePreviewWidthFromViewport(input: {
  activeTaskDuration: number;
  participantsColumnWidth: number;
  sidebarWidth: number | undefined;
  viewMode: DraggableTaskViewMode;
}): number {
  const widthPercent = getWidthPercent(input.activeTaskDuration);
  if (input.viewMode === 'full') {
    const vw = window.innerWidth;
    const swimlaneWidth =
      (200 * vw) / 100 - input.participantsColumnWidth - (input.sidebarWidth || 0) * 2;
    return Math.max(0, (swimlaneWidth * widthPercent) / 100 - CARD_MARGIN * 2);
  }

  const containerWidth =
    window.innerWidth - (input.sidebarWidth || 0) - input.participantsColumnWidth;
  return Math.max(0, (containerWidth * widthPercent) / 100 - CARD_MARGIN * 2);
}

function canComputeDraggableTaskPreviewWidth(input: {
  activeTaskDuration: number | null | undefined;
  isActiveTask: boolean;
  isDragging: boolean;
  viewMode: DraggableTaskViewMode;
  widthPercent: number;
}): boolean {
  if (input.viewMode === 'compact') return false;
  if (!input.isDragging || !input.isActiveTask) return false;
  if (input.activeTaskDuration == null) return false;
  return !shouldUseInitialDragWidth(input.widthPercent);
}

export function computeDraggableTaskPreviewWidth(input: {
  activeTaskDuration: number;
  isActiveTask: boolean;
  isDragging: boolean;
  participantsColumnWidth: number;
  sidebarWidth: number | undefined;
  viewMode: 'compact' | 'full' | undefined;
  widthPercent: number;
}): number | undefined {
  if (!canComputeDraggableTaskPreviewWidth(input)) return undefined;

  try {
    const fromSwimlane = computePreviewWidthFromSwimlane(input.activeTaskDuration);
    if (fromSwimlane != null) return fromSwimlane;
    return computePreviewWidthFromViewport({
      activeTaskDuration: input.activeTaskDuration,
      participantsColumnWidth: input.participantsColumnWidth,
      sidebarWidth: input.sidebarWidth,
      viewMode: input.viewMode,
    });
  } catch (error) {
    console.warn('Error calculating preview width:', error);
    return undefined;
  }
}

function buildIdleDragStyle(
  transformCss: string | undefined
): CSSProperties {
  return { transform: transformCss };
}

function buildPlannerOverlayDragStyle(
  transformCss: string | undefined
): CSSProperties {
  return { transform: transformCss };
}

function buildCursorFollowDragStyle(input: {
  initialRect: { left: number; top: number; width: number };
  mouseOffset: { x: number; y: number };
  mousePosition: { x: number; y: number };
  previewWidth: number | undefined;
  zIndex: number;
}): React.CSSProperties {
  const width =
    input.previewWidth !== undefined ? input.previewWidth : input.initialRect.width;
  return {
    position: 'fixed',
    left: `${input.mousePosition.x - input.mouseOffset.x}px`,
    top: `${input.mousePosition.y - input.mouseOffset.y}px`,
    width: `${width}px`,
    zIndex: input.zIndex,
    pointerEvents: 'none',
  };
}

function buildTransformDragStyle(input: {
  initialRect: { left: number; top: number; width: number };
  previewWidth: number | undefined;
  transformCss: string | undefined;
  zIndex: number;
}): React.CSSProperties {
  const width =
    input.previewWidth !== undefined ? input.previewWidth : input.initialRect.width;
  const base = {
    position: 'fixed' as const,
    left: `${input.initialRect.left}px`,
    top: `${input.initialRect.top}px`,
    width: `${width}px`,
    zIndex: input.zIndex,
    pointerEvents: 'none' as const,
  };
  if (input.transformCss) {
    return { ...base, transform: input.transformCss };
  }
  return base;
}

function buildFallbackDragStyle(input: {
  previewWidth: number | undefined;
  transformCss: string | undefined;
  zIndex: number;
}): React.CSSProperties {
  return {
    position: 'fixed',
    transform: input.transformCss,
    zIndex: input.zIndex,
    pointerEvents: 'none',
    width: input.previewWidth !== undefined ? `${input.previewWidth}px` : '200px',
  };
}

export function captureDragInitialRect(element: HTMLElement): { left: number; top: number; width: number } | null {
  if (!element.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;
  return { left: rect.left, top: rect.top, width: rect.width };
}

function buildActiveDraggableTaskStyle(input: {
  initialRect: { left: number; top: number; width: number } | null;
  mouseOffset: { x: number; y: number } | null;
  mousePosition: { x: number; y: number } | null;
  previewWidth: number | undefined;
  transformCss: string | undefined;
  zIndex: number;
}): CSSProperties {
  const width = input.previewWidth !== undefined ? input.previewWidth : input.initialRect?.width;
  if (input.initialRect && input.mouseOffset && input.mousePosition) {
    return buildCursorFollowDragStyle({
      initialRect: input.initialRect,
      mouseOffset: input.mouseOffset,
      mousePosition: input.mousePosition,
      previewWidth: width,
      zIndex: input.zIndex,
    });
  }
  if (input.initialRect && input.mouseOffset) {
    return buildTransformDragStyle({
      initialRect: input.initialRect,
      previewWidth: width,
      transformCss: input.transformCss,
      zIndex: input.zIndex,
    });
  }
  return buildFallbackDragStyle({
    previewWidth: width,
    transformCss: input.transformCss,
    zIndex: input.zIndex,
  });
}

export function buildDraggableTaskStyle(input: {
  initialRect: { left: number; top: number; width: number } | null;
  isDragging: boolean;
  mouseOffset: { x: number; y: number } | null;
  mousePosition: { x: number; y: number } | null;
  previewWidth: number | undefined;
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null;
  viewMode: 'compact' | 'full' | undefined;
  zIndex: number;
}): CSSProperties {
  const transformCss = CSS.Translate.toString(input.transform);
  if (!input.isDragging) return buildIdleDragStyle(transformCss);
  if (input.viewMode === 'compact' || input.viewMode === 'full') {
    return buildPlannerOverlayDragStyle(transformCss);
  }

  return buildActiveDraggableTaskStyle({
    initialRect: input.initialRect,
    mouseOffset: input.mouseOffset,
    mousePosition: input.mousePosition,
    previewWidth: input.previewWidth,
    transformCss,
    zIndex: input.zIndex,
  });
}

export const DEFAULT_PARTICIPANTS_COLUMN_WIDTH = DEVELOPER_COLUMN_WIDTH;
