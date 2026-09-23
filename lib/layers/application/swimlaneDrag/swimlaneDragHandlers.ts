/**
 * Обработчики dnd-kit для свимлейна (без React; состояние через SwimlaneDragStateApi).
 */

import type { DragContextRef, SwimlaneDragStateApi } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { parseSwimlaneTaskDraggableId } from '@/lib/swimlane/swimlaneDragIds';

import {
  applySwimlaneDragEndPositionUpdate,
  handleSwimlaneBacklogDrop,
  handleSwimlaneSidebarDrop,
  isSwimlaneSidebarDropTarget,
  resolveSwimlaneDragFinalCell,
} from './swimlaneDragEndHelpers';
import {
  applySwimlaneDragOverCell,
  isSidebarSourcedDragEvent,
  updateSidebarDropPreview,
} from './swimlaneDragHandlerHelpers';

function taskExistsInDragContext(
  taskId: string,
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>
): boolean {
  return tasks.some((t) => t.id === taskId) || taskPositions.has(taskId);
}

function isSidebarSourcedDragEventFromContext(
  event: DragEndEvent | DragOverEvent | DragStartEvent,
  dragContextRef?: DragContextRef | null
): boolean {
  return isSidebarSourcedDragEvent(event, dragContextRef);
}

export function createSwimlaneDragStartHandler(params: {
  dragState: SwimlaneDragStateApi;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
}): (event: DragStartEvent) => void {
  const { tasks, taskPositions, dragState } = params;

  return (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    const { taskId } = parseSwimlaneTaskDraggableId(activeId);

    const fromSidebar = isSidebarSourcedDragEventFromContext(event);
    if (!fromSidebar && !taskExistsInDragContext(taskId, tasks, taskPositions)) {
      return;
    }

    if (dragState.isDraggingTask && dragState.activeTaskId !== taskId) {
      dragState.resetDragState();
    }

    dragState.beginDragSession(activeId, taskId);
  };
}

function clearHoveredCellIfNeeded(dragState: SwimlaneDragStateApi): void {
  if (dragState.hoveredCell !== null) {
    dragState.setHoveredCell(null);
  }
}

function processSwimlaneDragOverEvent(
  event: DragOverEvent,
  params: {
    dragContextRef?: DragContextRef | null;
    dragState: SwimlaneDragStateApi;
    taskPositions: Map<string, TaskPosition>;
    tasks: Task[];
    workingDaysCount: number;
  }
): void {
  const { dragContextRef, dragState, taskPositions, tasks, workingDaysCount } = params;
  if (!dragState.isDraggingTask || !dragState.activeTaskId) {
    return;
  }

  const activeTaskId = dragState.activeTaskId;
  const fromSidebar = dragContextRef?.current?.isDragFromSidebar ?? false;
  if (!fromSidebar && !taskExistsInDragContext(activeTaskId, tasks, taskPositions)) {
    dragState.resetDragState();
    return;
  }

  if (updateSidebarDropPreview(event, dragState, dragContextRef)) {
    clearHoveredCellIfNeeded(dragState);
    return;
  }

  applySwimlaneDragOverCell(event, dragState, taskPositions, tasks, workingDaysCount);
}

export function createSwimlaneDragOverHandler(params: {
  dragContextRef?: DragContextRef | null;
  dragState: SwimlaneDragStateApi;
  swimlaneTimelineWorkingDays?: number;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
}): (event: DragOverEvent) => void {
  const workingDaysCount = Math.max(1, params.swimlaneTimelineWorkingDays ?? WORKING_DAYS);

  return (event: DragOverEvent) => {
    processSwimlaneDragOverEvent(event, { ...params, workingDaysCount });
  };
}

interface SwimlaneDragEndHandlerParams {
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

function isBacklogSourcedTask(
  taskId: string,
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>
): boolean {
  return !taskPositions.has(taskId) && !tasks.some((task) => task.id === taskId);
}

function tryHandleSwimlaneDragEndDrop(
  event: DragEndEvent,
  params: SwimlaneDragEndHandlerParams & { workingDaysCount: number },
  taskId: string,
  activeId: string,
  overId: string
): boolean {
  if (isSwimlaneSidebarDropTarget(event, params.dragState, params.dragContextRef)) {
    handleSwimlaneSidebarDrop({
      dragState: params.dragState,
      onPositionDelete: params.onPositionDelete,
      taskId,
      updateXarrow: params.updateXarrow,
    });
    return true;
  }

  if (isBacklogSourcedTask(taskId, params.tasks, params.taskPositions) && params.onBacklogTaskDrop) {
    handleSwimlaneBacklogDrop({
      activeId,
      dragState: params.dragState,
      event,
      onBacklogTaskDrop: params.onBacklogTaskDrop,
      overId,
      taskId,
      taskPositions: params.taskPositions,
      tasks: params.tasks,
      updateXarrow: params.updateXarrow,
      workingDaysCount: params.workingDaysCount,
    });
    return true;
  }

  return false;
}

function processSwimlaneDragEndEvent(
  event: DragEndEvent,
  params: SwimlaneDragEndHandlerParams & { totalCells: number; workingDaysCount: number }
): void {
  const { active, over } = event;
  if (!over) {
    return;
  }

  const activeId = active.id as string;
  const { taskId, segmentIndex } = parseSwimlaneTaskDraggableId(activeId);
  const overId = over.id as string;
  const fromSidebar = isSidebarSourcedDragEventFromContext(event, params.dragContextRef);

  if (!fromSidebar && !taskExistsInDragContext(taskId, params.tasks, params.taskPositions)) {
    return;
  }

  if (tryHandleSwimlaneDragEndDrop(event, params, taskId, activeId, overId)) {
    return;
  }

  const finalCell = resolveSwimlaneDragFinalCell({
    activeId,
    dragState: params.dragState,
    event,
    taskPositions: params.taskPositions,
    tasks: params.tasks,
    workingDaysCount: params.workingDaysCount,
  });
  if (!finalCell) {
    return;
  }
  applySwimlaneDragEndPositionUpdate({
    finalCell,
    onPositionUpdate: params.onPositionUpdate,
    segmentIndex,
    taskId,
    taskPositions: params.taskPositions,
    tasks: params.tasks,
    totalCells: params.totalCells,
  });
  requestAnimationFrame(() => {
    params.updateXarrow();
  });
}

export function createSwimlaneDragEndHandler(
  params: SwimlaneDragEndHandlerParams
): (event: DragEndEvent) => void {
  const workingDaysCount = Math.max(1, params.swimlaneTimelineWorkingDays ?? WORKING_DAYS);
  const totalCells = workingDaysCount * getPartsPerDay();

  return (event: DragEndEvent) => {
    try {
      processSwimlaneDragEndEvent(event, { ...params, totalCells, workingDaysCount });
    } finally {
      params.dragState.resetDragState();
    }
  };
}
