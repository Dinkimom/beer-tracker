/**
 * Компонент секции сайдбара
 * Отвечает за отображение кнопки переключения и самого сайдбара
 */

import type { Developer, Task, TaskPosition } from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

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
  checklistDone: number;
  checklistTotal: number;
  contextMenuBlurOtherCards?: boolean;
  deliveryChecklistItems?: ChecklistItem[];
  deliveryGoalsLoading?: boolean;
  developers: Developer[];
  developersManagement: {
    handleDragEnd: (activeId: string, overId: string) => void;
    hiddenIds: Set<string>;
    hideAllDevelopers: () => void;
    setSortBy: (sort: 'custom' | 'name' | 'sp' | 'tasks' | 'tp') => void;
    showAllDevelopers: () => void;
    sortBy: 'custom' | 'name' | 'sp' | 'tasks' | 'tp';
    toggleDeveloperVisibility: (id: string) => void;
    sortedDevelopers: Developer[];
    visibleDevelopers: Developer[];
  };
  discoveryChecklistItems?: ChecklistItem[];
  discoveryGoalsLoading?: boolean;
  goalsLoading: boolean;
  goalTaskIds?: string[];
  isSidebarDropTarget?: boolean;
  qaTasksMap: Map<string, Task>;
  selectedBoardId: number | null;
  selectedSprintId: number | null;
  sidebarDropPointerY?: number | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  sprintInfo: SprintInfo | null;
  sprints: SprintListItem[];
  taskPositions?: Map<string, TaskPosition> | null;
  unassignedTasks: Task[];
  viewMode: 'compact' | 'features' | 'full' | 'kanban' | 'occupancy';
  onAutoAddToSwimlane?: (task: Task) => void;
  onAutoAssignTasks: () => Promise<void>;
  onContextMenu: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onGoalsUpdate?: () => void;
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
  sidebarDropPointerY = null,
  allSprintTasks,
  checklistDone,
  checklistTotal,
  contextMenuBlurOtherCards = false,
  deliveryChecklistItems = [],
  discoveryChecklistItems = [],
  developers,
  developersManagement,
  deliveryGoalsLoading = false,
  discoveryGoalsLoading = false,
  goalTaskIds = [],
  goalsLoading,
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
  onContextMenu,
  onGoalsUpdate,
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
        checklistDone={checklistDone}
        checklistTotal={checklistTotal}
        contextMenuBlurOtherCards={contextMenuBlurOtherCards}
        contextMenuTaskId={contextMenuTaskId}
        deliveryChecklistItems={deliveryChecklistItems}
        deliveryGoalsLoading={deliveryGoalsLoading}
        developers={developers}
        developersManagement={developersManagement}
        discoveryChecklistItems={discoveryChecklistItems}
        discoveryGoalsLoading={discoveryGoalsLoading}
        goalTaskIds={goalTaskIds}
        goalsLoading={goalsLoading}
        hideBacklogTab
        hideTasksTab={viewMode === 'occupancy' || viewMode === 'kanban'}
        qaTasksMap={qaTasksMap}
        selectedBoardId={selectedBoardId}
        selectedSprintId={selectedSprintId}
        sidebarDropPointerY={sidebarDropPointerY}
        sidebarDropTargetActive={isSidebarDropTarget}
        sprintInfo={sprintInfo}
        sprints={sprints}
        taskPositions={taskPositions}
        tasks={unassignedTasks}
        viewMode={
          viewMode === 'occupancy' || viewMode === 'kanban' || viewMode === 'features'
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
        onGoalsUpdate={onGoalsUpdate}
        onReturnAllTasks={onReturnAllTasks}
        onSprintTaskUpserted={onSprintTaskUpserted}
        onTasksReload={onTasksReload}
      />
    </ResizableSidebar>
  );
});

