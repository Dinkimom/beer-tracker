/**
 * Хук для управления drag and drop операциями
 */

import type { DragContextRef } from './useDragAndDrop/hooks/useDragEnd';
import type { Task, TaskPosition } from '@/types';

import { useMemo } from 'react';

import { resolveActiveDragDurationParts } from '@/lib/layers/application/swimlaneDrag';

import { useDragEnd } from './useDragAndDrop/hooks/useDragEnd';
import { useDragOver } from './useDragAndDrop/hooks/useDragOver';
import { useDragStart } from './useDragAndDrop/hooks/useDragStart';
import { useDragState } from './useDragAndDrop/hooks/useDragState';

interface UseDragAndDropProps {
  dragContextRef?: DragContextRef | null;
  /** Рабочих дней в таймлайне свимлейна (длина спринта) */
  swimlaneTimelineWorkingDays?: number;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  onBacklogTaskDrop?: (taskId: string, assigneeId: string, day: number, part: number) => void;
  onPositionDelete: (taskId: string) => void;
  onPositionUpdate: (taskId: string, position: TaskPosition) => void;
  updateXarrow: () => void;
}

export function useDragAndDrop({
  tasks,
  taskPositions,
  onPositionUpdate,
  onPositionDelete,
  updateXarrow,
  onBacklogTaskDrop,
  dragContextRef,
  swimlaneTimelineWorkingDays,
}: UseDragAndDropProps) {
  const { dragUi, dragStateApi } = useDragState(taskPositions.size);

  const { handleDragStart } = useDragStart({
    tasks,
    taskPositions,
    dragState: dragStateApi,
  });

  const { handleDragOver } = useDragOver({
    tasks,
    taskPositions,
    dragState: dragStateApi,
    dragContextRef,
    swimlaneTimelineWorkingDays,
  });

  const { handleDragEnd } = useDragEnd({
    tasks,
    taskPositions,
    onBacklogTaskDrop,
    onPositionDelete,
    onPositionUpdate,
    updateXarrow,
    dragState: dragStateApi,
    dragContextRef,
    swimlaneTimelineWorkingDays,
  });

  const activeTaskDuration = useMemo(
    () =>
      resolveActiveDragDurationParts(
        dragUi.activeTaskId,
        dragUi.activeDraggableId,
        taskPositions,
        tasks
      ),
    [dragUi.activeTaskId, dragUi.activeDraggableId, taskPositions, tasks]
  );

  return {
    activeTaskId: dragUi.activeTaskId,
    activeDraggableId: dragUi.activeDraggableId,
    isDraggingTask: dragUi.isDraggingTask,
    isSidebarDropTarget: dragUi.isSidebarDropTarget,
    sidebarDropPointerY: dragUi.sidebarDropPointerY,
    hoveredCell: dragUi.hoveredCell,
    activeTaskDuration,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetDragState: dragStateApi.resetDragState,
  };
}
