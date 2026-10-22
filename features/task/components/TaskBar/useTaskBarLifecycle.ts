import { useEffect } from 'react';

import { LINK_ARROW_DELETE_HANDLE_SELECTOR } from '@/features/swimlane/utils/task-arrows/linkArrowDeleteHandleHelpers';
import { useRootStore } from '@/lib/layers';

import { shouldCollapseTaskBarLongHoverExpand } from './taskBarHelpers';

export function useTaskBarLifecycle({
  contextMenuTaskId,
  effectiveIsDragging,
  htmlAnchorId,
  isLinking,
  leftPercent,
  longHoverTimeoutRef,
  requestArrowRedraw,
  setIsExpandedByLongHover,
  shouldExpandByLongHover,
  taskId,
  widthPercent,
}: {
  contextMenuTaskId: string | null;
  effectiveIsDragging: boolean;
  htmlAnchorId: string;
  isLinking: boolean;
  leftPercent: number;
  longHoverTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  requestArrowRedraw: () => void;
  setIsExpandedByLongHover: React.Dispatch<React.SetStateAction<boolean>>;
  shouldExpandByLongHover: boolean;
  taskId: string;
  widthPercent: number;
}): void {
  const hoveredTaskId = useRootStore().sprintPlannerUi.hoveredTaskId;

  useEffect(() => {
    if (!effectiveIsDragging) {
      const timeoutId = setTimeout(() => {
        requestArrowRedraw();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [
    leftPercent,
    widthPercent,
    effectiveIsDragging,
    requestArrowRedraw,
    shouldExpandByLongHover,
  ]);

  // Стрелки связей догоняют карточку после анимации left/width (ресайз, long-hover).
  useEffect(() => {
    const element = document.getElementById(htmlAnchorId);
    if (!element) return;
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === element && (event.propertyName === 'width' || event.propertyName === 'left')) {
        requestArrowRedraw();
      }
    };
    element.addEventListener('transitionend', onTransitionEnd);
    return () => element.removeEventListener('transitionend', onTransitionEnd);
  }, [htmlAnchorId, requestArrowRedraw]);

  useEffect(() => {
    if (!effectiveIsDragging && !isLinking) return;
    if (longHoverTimeoutRef.current) {
      clearTimeout(longHoverTimeoutRef.current);
      longHoverTimeoutRef.current = null;
    }
    setIsExpandedByLongHover(false);
  }, [effectiveIsDragging, isLinking, longHoverTimeoutRef, setIsExpandedByLongHover]);

  useEffect(() => {
    return () => {
      if (longHoverTimeoutRef.current) {
        clearTimeout(longHoverTimeoutRef.current);
        longHoverTimeoutRef.current = null;
      }
    };
  }, [longHoverTimeoutRef]);

  useEffect(() => {
    const contextMenuOpenForThis = contextMenuTaskId === taskId;
    const isPointerOverCard = document.getElementById(htmlAnchorId)?.matches(':hover') ?? false;
    const isPointerOverLinkDeleteHandle =
      document.querySelector(`${LINK_ARROW_DELETE_HANDLE_SELECTOR}:hover`) != null;
    if (
      shouldCollapseTaskBarLongHoverExpand({
        contextMenuOpenForThis,
        isHoveredSource: hoveredTaskId === taskId,
        isPointerOverCard,
        isPointerOverLinkDeleteHandle,
      })
    ) {
      setIsExpandedByLongHover(false);
    }
  }, [contextMenuTaskId, hoveredTaskId, htmlAnchorId, setIsExpandedByLongHover, taskId]);
}
