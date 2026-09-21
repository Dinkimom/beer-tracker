/**
 * Хук для обработки перетаскивания
 */

import type { Task, TaskPosition } from '@/types';

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

export function useDragOver(props: UseDragOverProps) {
  return {
    handleDragOver: createSwimlaneDragOverHandler(props),
  };
}
