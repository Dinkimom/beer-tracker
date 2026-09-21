/**
 * Хук для управления логикой DraggableTask
 */

import { useDraggable } from '@dnd-kit/core';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { ZIndex } from '@/constants';
import { getWidthPercent } from '@/features/swimlane/utils/positionUtils';
import { useParticipantsColumnWidthStorage } from '@/hooks/useLocalStorage';

import {
  buildDraggableTaskStyle,
  captureDragInitialRect,
  computeDraggableTaskPreviewWidth,
  DEFAULT_PARTICIPANTS_COLUMN_WIDTH,
  shouldUseInitialDragWidth,
} from './useDraggableTaskHelpers';

interface UseDraggableTaskProps {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  sidebarWidth?: number;
  taskId: string;
  viewMode?: 'compact' | 'full';
}

export function useDraggableTask({
  taskId,
  activeTaskId,
  activeTaskDuration,
  viewMode,
  sidebarWidth,
}: UseDraggableTaskProps) {
  const [participantsColumnWidth] = useParticipantsColumnWidthStorage(DEFAULT_PARTICIPANTS_COLUMN_WIDTH);
  const [initialRect, setInitialRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const [mouseOffset, setMouseOffset] = useState<{ x: number; y: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: taskId,
    data: { source: 'sidebar' as const },
  });

  useEffect(() => {
    if (!isDragging) {
      setMousePosition(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging]);

  useEffect(() => {
    if (isDragging && !initialRect) {
      const updateRect = () => {
        const element = elementRef.current;
        const rect = element ? captureDragInitialRect(element) : null;
        if (rect) {
          setInitialRect(rect);
          return true;
        }
        return false;
      };

      if (!updateRect()) {
        const rafId = requestAnimationFrame(() => {
          updateRect();
        });
        return () => cancelAnimationFrame(rafId);
      }
    } else if (!isDragging) {
      setInitialRect(null);
      setMouseOffset(null);
    }
  }, [isDragging, taskId, initialRect]);

  const isActiveTask = activeTaskId === taskId;
  const widthPercent = useMemo(() => {
    return isActiveTask && activeTaskDuration !== null && activeTaskDuration !== undefined
      ? getWidthPercent(activeTaskDuration)
      : 10;
  }, [isActiveTask, activeTaskDuration]);

  const [resizeTrigger, setResizeTrigger] = useState(0);

  const previewWidth = useMemo(() => {
    if (
      activeTaskDuration == null ||
      !isDragging ||
      !isActiveTask ||
      shouldUseInitialDragWidth(widthPercent)
    ) {
      return undefined;
    }

    return computeDraggableTaskPreviewWidth({
      activeTaskDuration,
      isActiveTask,
      isDragging,
      participantsColumnWidth,
      sidebarWidth,
      viewMode,
      widthPercent,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isActiveTask, activeTaskDuration, viewMode, sidebarWidth, participantsColumnWidth, resizeTrigger, widthPercent]);

  useEffect(() => {
    if (!isDragging || !isActiveTask) {
      return;
    }

    const handleResize = () => {
      setResizeTrigger((prev) => prev + 1);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isDragging, isActiveTask]);

  const style: React.CSSProperties = useMemo(
    () =>
      buildDraggableTaskStyle({
        initialRect,
        isDragging,
        mouseOffset,
        mousePosition,
        previewWidth,
        transform,
        viewMode,
        zIndex: ZIndex.dragPreview,
      }),
    [isDragging, initialRect, mouseOffset, mousePosition, previewWidth, transform, viewMode]
  );

  const combinedRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      setMouseOffset({ x: offsetX, y: offsetY });
      setInitialRect({ left: rect.left, top: rect.top, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (isDragging && !mouseOffset && initialRect) {
      setMouseOffset({ x: initialRect.width / 2, y: 20 });
    }
  }, [isDragging, mouseOffset, initialRect]);

  return {
    attributes,
    listeners,
    combinedRef,
    isDragging,
    style,
    widthPercent,
    handleMouseDown,
  };
}
