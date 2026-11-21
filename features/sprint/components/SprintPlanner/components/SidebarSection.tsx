/**
 * Компонент секции сайдбара
 * Отвечает за отображение кнопки переключения и самого сайдбара
 */

import type { DevelopersManagement } from '@/features/sprint/hooks/useDevelopersManagement';
import type { Developer, Task, TaskPosition } from '@/types';
import type { SprintInfo, SprintListItem } from '@/types/tracker';

import { observer } from 'mobx-react-lite';

import { ResizableSidebar } from '@/components/ResizableSidebar';
import { TaskSidebar } from '@/features/sidebar/components/Sidebar';
import { useRootStore } from '@/lib/layers';

interface SidebarSectionProps {
  activeTaskDuration: number | null;
  activeTaskId: string | null;
  allSprintTasks: Task[];
  backlogTaskRef: React.MutableRefObject<{
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  } | null>;
  closedHandleHost?: HTMLElement | null;
  contextMenuBlurOtherCards?: boolean;
  developers: Developer[];
  developersManagement: DevelopersManagement;
  goalTaskIds?: string[];
  isSidebarDropTarget?: boolean;
  qaTasksMap: Map<string, Task>;
  selectedBoardId: number | null;
  selectedSprintId: number | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  sprintInfo: SprintInfo | null;
  sprints: SprintListItem[];
  taskPositions?: Map<string, TaskPosition> | null;
  unassignedTasks: Task[];
  viewMode: 'compact' | 'features' | 'full' | 'kanban';
  onAutoAddToSwimlane?: (task: Task) => void;
  onAutoAssignTasks: () => Promise<void>;
  onContextMenu: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onPlanAssignees?: (assigneeIds: ReadonlySet<string>) => void;
  onReturnAllTasks: () => Promise<void>;
  onSprintTaskUpserted?: (task: Task) => void;
  onTasksReload?: () => void;
  onToggle: () => void;
  onWidthChange: (width: number) => void;
}

export const SidebarSection = observer(function SidebarSection({
  activeTaskDuration,
  activeTaskId,
  isSidebarDropTarget = false,
  allSprintTasks,
  closedHandleHost = null,
  contextMenuBlurOtherCards = false,
  developers,
  developersManagement,
  goalTaskIds = [],
  qaTasksMap,
  taskPositions = null,
  selectedBoardId,
  selectedSprintId,
  sidebarOpen,
  sidebarWidth,
  sprintInfo,
  sprints,
  unassignedTasks,
  viewMode,
  backlogTaskRef,
  onAutoAddToSwimlane,
  onAutoAssignTasks,
  onPlanAssignees,
  onContextMenu,
  onReturnAllTasks,
  onSprintTaskUpserted,
  onTasksReload,
  onToggle,
  onWidthChange,
}: SidebarSectionProps) {
  const { sprintPlannerUi } = useRootStore();
  const contextMenuTaskId = sprintPlannerUi.contextMenuTaskId;

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
        activeTaskDuration={activeTaskDuration}
        activeTaskId={activeTaskId}
        allSprintTasks={allSprintTasks}
        contextMenuBlurOtherCards={contextMenuBlurOtherCards}
        contextMenuTaskId={contextMenuTaskId}
        developers={developers}
        developersManagement={developersManagement}
        goalTaskIds={goalTaskIds}
        hideBacklogTab
        hideTasksTab={viewMode === 'kanban'}
        qaTasksMap={qaTasksMap}
        selectedBoardId={selectedBoardId}
        selectedSprintId={selectedSprintId}
        sidebarDropTargetActive={isSidebarDropTarget}
        sprintInfo={sprintInfo}
        sprints={sprints}
        taskPositions={taskPositions}
        tasks={unassignedTasks}
        viewMode={
          viewMode === 'kanban' || viewMode === 'features'
            ? 'full'
            : viewMode
        }
        width={sidebarWidth}
        onAutoAddToSwimlane={onAutoAddToSwimlane}
        onAutoAssignTasks={onAutoAssignTasks}
        onBacklogTaskRef={(ref) => {
          backlogTaskRef.current = ref;
        }}
        onContextMenu={onContextMenu}
        onPlanAssignees={onPlanAssignees}
        onReturnAllTasks={onReturnAllTasks}
        onSprintTaskUpserted={onSprintTaskUpserted}
        onTasksReload={onTasksReload}
      />
    </ResizableSidebar>
  );
});

