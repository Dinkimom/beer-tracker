'use client';

import type { Task } from '@/types';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { SidebarResizeHandle } from '@/components/SidebarResizeHandle';
import { ZIndex } from '@/constants';
import { useResize } from '@/features/sidebar/hooks/useResize';
import { TaskInfoSidebarPanel } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarPanel';
import { useTaskInfoSidebarWidthStorage } from '@/hooks/useLocalStorage';
import { useSidePanelPresence } from '@/hooks/useSidePanelPresence';

const TASK_INFO_SIDEBAR_MIN_WIDTH_PX = 360;
const TASK_INFO_SIDEBAR_MAX_WIDTH_PX = 720;
const TASK_INFO_SIDEBAR_DEFAULT_WIDTH_PX = 440;

const emptySubscribe = () => () => {};

interface TaskInfoSidebarProps {
  task: Task | null;
  onClose: () => void;
  onFieldsSaved?: (fields: { description?: string; name?: string }) => void;
  onStatusChange?: (
    taskId: string,
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => Promise<void>;
}

/**
 * Правый сайдер с информацией о задаче.
 * Страница остаётся интерактивной; закрытие только крестиком; ширина ресайзится и сохраняется.
 */
export function TaskInfoSidebar({ task, onClose, onFieldsSaved, onStatusChange }: TaskInfoSidebarProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => typeof document !== 'undefined',
    () => false
  );
  const [heldTask, setHeldTask] = useState(task);
  if (task !== null && (heldTask === null || heldTask.id !== task.id)) {
    setHeldTask(task);
  }
  const displayedTask = task ?? heldTask;
  const presence = useSidePanelPresence(task !== null);
  const [width, setWidth] = useTaskInfoSidebarWidthStorage(TASK_INFO_SIDEBAR_DEFAULT_WIDTH_PX);

  const { isResizing, setIsResizing } = useResize({
    calculateValue: (event) => window.innerWidth - event.clientX,
    onValueChange: setWidth,
    min: TASK_INFO_SIDEBAR_MIN_WIDTH_PX,
    max: TASK_INFO_SIDEBAR_MAX_WIDTH_PX,
    clamp: true,
  });

  useEffect(() => {
    if (!isResizing) {
      return;
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  if (!presence.mounted || !mounted || !displayedTask) {
    return null;
  }

  return createPortal(
    <div
      key={displayedTask.id}
      aria-hidden={presence.isExiting}
      className={`${presence.className} fixed inset-y-0 right-0 flex ${ZIndex.class('sidePanel')}`}
      style={{
        width,
        zIndex: ZIndex.sidePanel,
      }}
      onAnimationEnd={presence.onAnimationEnd}
    >
      <div className="relative flex h-full w-full flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <TaskInfoSidebarPanel
          task={displayedTask}
          onClose={onClose}
          onFieldsSaved={onFieldsSaved}
          onStatusChange={onStatusChange}
        />
        <SidebarResizeHandle
          isResizing={isResizing}
          linesCount={3}
          side="left"
          onMouseDown={(event) => {
            event.preventDefault();
            setIsResizing(true);
          }}
        />
      </div>
    </div>,
    document.body
  );
}
