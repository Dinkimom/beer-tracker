/**
 * Оболочка сайдбара планера: выезжающая панель с ресайзом. Содержимое и его данные — `TaskSidebar`,
 * пропсы для него проходят насквозь одним объектом; здесь только панель и режим доски.
 */

import type { TaskSidebarProps } from '@/features/sidebar/components/Sidebar';

import { ResizableSidebar } from '@/components/ResizableSidebar';
import { TaskSidebar } from '@/features/sidebar/components/Sidebar';

interface SidebarSectionProps
  extends Omit<TaskSidebarProps, 'hideTasksTab' | 'viewMode' | 'width'> {
  closedHandleHost?: HTMLElement | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  viewMode: 'compact' | 'features' | 'full' | 'kanban';
  onToggle: () => void;
  onWidthChange: (width: number) => void;
}

export function SidebarSection({
  closedHandleHost = null,
  sidebarOpen,
  sidebarWidth,
  viewMode,
  onToggle,
  onWidthChange,
  ...sidebar
}: SidebarSectionProps) {
  return (
    <ResizableSidebar
      chrome="island"
      closedHandleHost={closedHandleHost}
      isOpen={sidebarOpen}
      maxWidth={500}
      minWidth={300}
      resizeHandleSide="left"
      width={sidebarWidth}
      onToggle={onToggle}
      onWidthChange={onWidthChange}
    >
      <TaskSidebar
        {...sidebar}
        // На канбане задачи уже на доске — вкладка «Задачи» не нужна; карточки сайдбара — полные.
        hideTasksTab={viewMode === 'kanban'}
        viewMode={viewMode === 'kanban' || viewMode === 'features' ? 'full' : viewMode}
        width={sidebarWidth}
      />
    </ResizableSidebar>
  );
}
