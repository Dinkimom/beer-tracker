/**
 * Хук для обработки начала перетаскивания
 */

import type { Task, TaskPosition } from '@/types';

import {
  createSwimlaneDragStartHandler,
  type SwimlaneDragStateApi,
} from '@/lib/layers/application/swimlaneDrag';

interface UseDragStartProps {
  dragState: SwimlaneDragStateApi;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
}

export function useDragStart(props: UseDragStartProps) {
  return {
    handleDragStart: createSwimlaneDragStartHandler(props),
  };
}
