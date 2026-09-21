/**
 * Хук для обработки окончания перетаскивания
 */

import type { Task, TaskPosition } from '@/types';

import {
  createSwimlaneDragEndHandler,
  type DragContextRef,
  type SwimlaneDragStateApi,
} from '@/lib/layers/application/swimlaneDrag';

export type { DragContextRef };

interface UseDragEndProps {
  dragContextRef?: DragContextRef | null;
  dragState: SwimlaneDragStateApi;
  swimlaneTimelineWorkingDays?: number;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  onBacklogTaskDrop?: (taskId: string, assigneeId: string, day: number, part: number) => void;
  onPositionDelete: (taskId: string) => void;
  onPositionUpdate: (taskId: string, position: TaskPosition) => void;
  updateXarrow: () => void;
}

export function useDragEnd(props: UseDragEndProps) {
  return {
    handleDragEnd: createSwimlaneDragEndHandler(props),
  };
}
