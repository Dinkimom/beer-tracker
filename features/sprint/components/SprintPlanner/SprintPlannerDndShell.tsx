'use client';

/**
 * Внешний `DndContext` планера (задачи + reorder строк разработчика).
 * Внутри `children` возможны **вложенные** `DndContext` (канбан, DnD комментариев в занятости) — см. раздел в `SprintPlanner/README.md`.
 */

import type { DragContextRef } from '@/features/swimlane/hooks/useDragAndDrop/hooks/useDragEnd';
import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { Developer, Task } from '@/types';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import type { ReactNode, RefObject } from 'react';

import { DndContext, DragOverlay, MouseSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';

import { ZIndex, getPartsPerDay } from '@/constants';
import { SWIMLANE_TASK_DRAG_ACTIVATION_DISTANCE_PX } from '@/features/swimlane/utils/swimlaneTaskDragActivation';

import {
  isActiveDeveloperRowDrag,
  resolveSwimlanePlannerAutoScrollOptions,
  runDeveloperRowDragEndIfApplicable,
} from './sprintPlannerDndHelpers';
import { SprintPlannerDragOverlayPreview } from './SprintPlannerDragOverlayPreview';

interface SprintPlannerDndShellProps {
  activeTask: Task | null;
  activeTaskDuration: number | null;
  children: ReactNode;
  developers: Developer[];
  developersManagement: {
    handleDragEnd: (activeDeveloperId: string, overDeveloperId: string) => void;
  };
  dragAndDrop: {
    handleDragEnd: (event: DragEndEvent) => void;
    handleDragOver: (event: DragOverEvent) => void;
    handleDragStart: (event: DragStartEvent) => void;
    resetDragState: () => void;
  };
  dragContextRef: DragContextRef;
  isDragFromSidebar: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  sidebarOpen: boolean;
  sidebarWidth: number;
  sprintTimelineWorkingDays: number;
  viewMode: BoardViewMode;
  setIsDragFromSidebar: (value: boolean) => void;
}

export function SprintPlannerDndShell({
  activeTask,
  activeTaskDuration,
  children,
  developers,
  developersManagement,
  dragAndDrop,
  dragContextRef,
  isDragFromSidebar,
  scrollContainerRef,
  setIsDragFromSidebar,
  sidebarOpen,
  sidebarWidth,
  sprintTimelineWorkingDays,
  viewMode,
}: SprintPlannerDndShellProps) {
  const swimlaneTimelineTotalParts = sprintTimelineWorkingDays * getPartsPerDay();
  const taskDragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: SWIMLANE_TASK_DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: SWIMLANE_TASK_DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: SWIMLANE_TASK_DRAG_ACTIVATION_DISTANCE_PX,
      },
    })
  );
  const swimlaneOverlayWidthPercent =
    activeTaskDuration != null && swimlaneTimelineTotalParts > 0
      ? (activeTaskDuration / swimlaneTimelineTotalParts) * 100
      : undefined;

  return (
    <DndContext
      autoScroll={resolveSwimlanePlannerAutoScrollOptions(viewMode, scrollContainerRef)}
      collisionDetection={closestCenter}
      sensors={taskDragSensors}
      onDragAbort={() => {
        dragAndDrop.resetDragState();
      }}
      onDragCancel={() => {
        dragAndDrop.resetDragState();
      }}
      onDragEnd={(event) => {
        setIsDragFromSidebar(false);
        // Только явный kind developer-row — не по префиксу id (ключ задач может быть `swimlane-…`, в onDragEnd data иногда пустой).
        if (isActiveDeveloperRowDrag(event.active)) {
          dragContextRef.current = null;
          runDeveloperRowDragEndIfApplicable(event, developersManagement.handleDragEnd);
          return;
        }
        dragAndDrop.handleDragEnd(event);
        dragContextRef.current = null;
      }}
      onDragOver={(event) => {
        if (isActiveDeveloperRowDrag(event.active)) {
          return;
        }
        if (dragContextRef.current) {
          dragContextRef.current = {
            ...dragContextRef.current,
            sidebarOpen,
            sidebarWidth,
            viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
          };
        }
        dragAndDrop.handleDragOver(event);
      }}
      onDragStart={(event) => {
        if (isActiveDeveloperRowDrag(event.active)) {
          return;
        }
        const fromSidebar =
          (event.active.data?.current as { source?: string } | undefined)?.source === 'sidebar';
        setIsDragFromSidebar(fromSidebar);
        dragContextRef.current = {
          isDragFromSidebar: fromSidebar,
          sidebarOpen,
          sidebarWidth,
          viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
        };
        dragAndDrop.handleDragStart(event);
      }}
    >
      {children}
      <DragOverlay
        dropAnimation={isDragFromSidebar ? undefined : null}
        style={{ zIndex: ZIndex.dragPreview }}
      >
        {activeTask ? (
          <SprintPlannerDragOverlayPreview
            activeTask={activeTask}
            activeTaskDuration={activeTaskDuration}
            developers={developers}
            isDragFromSidebar={isDragFromSidebar}
            swimlaneOverlayWidthPercent={swimlaneOverlayWidthPercent}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
