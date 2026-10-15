/**
 * Хук для обработки перетаскивания.
 * После ухода от per-cell droppable `onDragOver` почти не стреляет внутри полосы —
 * на каждом mousemove пересчитываем ячейку по последнему `over` + актуальному курсору
 * (позицию курсора пишет `useDragState`).
 */

import type { Task, TaskPosition } from '@/types';
import type { DragMoveEvent } from '@dnd-kit/core';

import { useEffect, useMemo, useRef } from 'react';

import {
  createSwimlaneDragOverHandler,
  type DragContextRef,
  type SwimlaneDragStateApi,
} from '@/lib/layers/application/swimlaneDrag';

interface UseDragOverProps {
  dragContextRef?: DragContextRef | null;
  dragState: SwimlaneDragStateApi;
  swimlaneTimelineWorkingDays?: number;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
}

export function useDragOver({
  dragContextRef,
  dragState,
  swimlaneTimelineWorkingDays,
  taskPositions,
  tasks,
}: UseDragOverProps) {
  const lastEventRef = useRef<DragMoveEvent | null>(null);
  const handlerParams = useMemo(
    () => ({
      dragContextRef,
      dragState,
      swimlaneTimelineWorkingDays,
      taskPositions,
      tasks,
    }),
    [dragContextRef, dragState, swimlaneTimelineWorkingDays, taskPositions, tasks]
  );

  const handleDragOver = useMemo(() => {
    const base = createSwimlaneDragOverHandler(handlerParams);
    return (event: DragMoveEvent) => {
      lastEventRef.current = event;
      base(event);
    };
  }, [handlerParams]);

  useEffect(() => {
    if (!dragState.isDraggingTask) {
      lastEventRef.current = null;
      return;
    }

    const base = createSwimlaneDragOverHandler(handlerParams);
    const onPointerSample = () => {
      const lastEvent = lastEventRef.current;
      if (!lastEvent) {
        return;
      }
      base(lastEvent);
    };

    window.addEventListener('mousemove', onPointerSample);
    return () => window.removeEventListener('mousemove', onPointerSample);
  }, [dragState.isDraggingTask, handlerParams]);

  return {
    handleDragOver,
  };
}
