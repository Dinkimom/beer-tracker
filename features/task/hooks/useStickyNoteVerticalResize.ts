/**
 * Вертикальный ресайз sticky-note по строкам карточек (MobX preview + persist через onLayoutCommit).
 */

import { useEffect, useState } from 'react';

import {
  pointerYToStickyNoteCardRowIndex,
  resolveStickyNoteCardRowLayoutFromBottomDrag,
  resolveStickyNoteCardRowLayoutFromTopDrag,
  resolveStickyNoteEffectiveCardRowLayout,
  resolveStickyNoteMaxCardRowIndex,
  resolveStickyNoteStartCardRow,
  type StickyNoteCardRowLayout,
} from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import { useRootStore } from '@/lib/layers';

interface UseStickyNoteVerticalResizeProps {
  assignedTaskLayer: number;
  committedCardRowLayout?: StickyNoteCardRowLayout;
  enabled?: boolean;
  hasTaskOverlaps: boolean;
  layerHeight: number;
  taskBandTotalHeight: number;
  taskId: string;
  onLayoutCommit?: (layout: StickyNoteCardRowLayout) => void;
  onResizeSessionChange?: (active: boolean) => void;
}

export function useStickyNoteVerticalResize({
  assignedTaskLayer,
  committedCardRowLayout,
  enabled = true,
  hasTaskOverlaps,
  layerHeight,
  onLayoutCommit,
  onResizeSessionChange,
  taskBandTotalHeight,
  taskId,
}: UseStickyNoteVerticalResizeProps) {
  const { sprintPlannerUi } = useRootStore();
  const committedOverride = enabled ? sprintPlannerUi.getStickyNoteCardRowOverride(taskId) : undefined;
  const committed = resolveStickyNoteEffectiveCardRowLayout(
    committedOverride ?? committedCardRowLayout
  );

  const [isResizing, setIsResizing] = useState(false);
  const [resizeSide, setResizeSide] = useState<'bottom' | 'top' | null>(null);

  const previewOverride =
    enabled && sprintPlannerUi.stickyNoteCardRowPreview?.taskId === taskId
      ? resolveStickyNoteEffectiveCardRowLayout(sprintPlannerUi.stickyNoteCardRowPreview)
      : null;
  const displayLayout = previewOverride ?? committed;

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent, side: 'bottom' | 'top') => {
    if (!enabled) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    const cardElement = e.currentTarget.closest('[data-task-id]') as HTMLElement | null;
    const rowElement = cardElement?.parentElement;
    if (!cardElement || !rowElement) {
      return;
    }

    const startLayout = resolveStickyNoteEffectiveCardRowLayout(
      sprintPlannerUi.getStickyNoteCardRowOverride(taskId) ?? committedCardRowLayout
    );
    const startRow = resolveStickyNoteStartCardRow(assignedTaskLayer, startLayout);
    const bottomRow = startRow + startLayout.span - 1;
    // Фиксируем top на mousedown: при росте карточки/строки rect.height растёт и ресайз застревает.
    const startRowTopPx = rowElement.getBoundingClientRect().top;

    setIsResizing(true);
    setResizeSide(side);
    onResizeSessionChange?.(true);

    let currentLayout: StickyNoteCardRowLayout = startLayout;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const maxRowIndex = resolveStickyNoteMaxCardRowIndex({
        hasTaskOverlaps,
        layerHeight,
        startRowIndex: startRow,
        taskBandTotalHeight,
      });
      const pointerRow = pointerYToStickyNoteCardRowIndex({
        hasTaskOverlaps,
        layerHeight,
        pointerYInRowPx: moveEvent.clientY - startRowTopPx,
        startRowIndex: startRow,
        taskBandTotalHeight,
      });

      currentLayout =
        side === 'bottom'
          ? resolveStickyNoteCardRowLayoutFromBottomDrag({
              assignedTaskLayer,
              bottomRowIndex: pointerRow,
              layout: startLayout,
              maxRowIndex,
            })
          : resolveStickyNoteCardRowLayoutFromTopDrag({
              assignedTaskLayer,
              anchorBottomRowIndex: bottomRow,
              maxRowIndex,
              topRowIndex: pointerRow,
            });

      sprintPlannerUi.setStickyNoteCardRowPreview({
        ...resolveStickyNoteEffectiveCardRowLayout(currentLayout),
        taskId,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      setIsResizing(false);
      setResizeSide(null);

      const committedLayout = resolveStickyNoteEffectiveCardRowLayout(currentLayout);
      sprintPlannerUi.commitStickyNoteCardRowLayout(taskId, committedLayout);
      onLayoutCommit?.(committedLayout);
      onResizeSessionChange?.(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return {
    cardRowLayout: displayLayout,
    handleResizeStart,
    isResizing,
    resizeSide,
  };
}
