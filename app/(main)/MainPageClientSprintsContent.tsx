'use client';

import type { SprintTab } from '@/components/PageHeader';
import type { Task } from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

import dynamic from 'next/dynamic';

import { SprintPlanner } from '@/features/sprint/components/SprintPlanner';

const BacklogPage = dynamic(
  () => import('@/features/backlog/components/BacklogPage').then((mod) => mod.BacklogPage),
  { ssr: false }
);

const BurndownChart = dynamic(
  () => import('@/features/burndown/components/BurndownChart').then((mod) => mod.BurndownChart),
  { ssr: false }
);

interface MainPageClientSprintsContentProps {
  activeTab: SprintTab;
  checklistDone: number;
  checklistTotal: number;
  deliveryChecklistItems: ChecklistItem[];
  deliveryGoalsLoading: boolean;
  discoveryChecklistItems: ChecklistItem[];
  discoveryGoalsLoading: boolean;
  goalsLoading: boolean;
  goalTaskIds: string[];
  loading: boolean;
  reloadTasksPending: boolean;
  selectedBoardId: number;
  selectedSprintId: number | null;
  sprintInfo: SprintInfo | null;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  tasks: Task[];
  tasksPending: boolean;
  onGoalsUpdate: () => void;
  onSprintChange: (sprintId: number | null) => void;
  onTasksReload: (options?: { showToast?: boolean }) => void;
}

export function MainPageClientSprintsContent({
  activeTab,
  checklistDone,
  checklistTotal,
  deliveryChecklistItems,
  deliveryGoalsLoading,
  discoveryChecklistItems,
  discoveryGoalsLoading,
  goalTaskIds,
  goalsLoading,
  loading,
  reloadTasksPending,
  selectedBoardId,
  selectedSprintId,
  sprintInfo,
  sprints,
  sprintsLoading,
  tasks,
  tasksPending,
  onGoalsUpdate,
  onSprintChange,
  onTasksReload,
}: MainPageClientSprintsContentProps) {
  return (
    <>
      {activeTab === 'backlog' && (
        <BacklogPage sprints={sprints} sprintsLoading={sprintsLoading} />
      )}

      {activeTab === 'board' && (
        <div className="flex flex-1 min-h-0 flex-col">
          <SprintPlanner
            checklistDone={checklistDone}
            checklistTotal={checklistTotal}
            deliveryChecklistItems={deliveryChecklistItems}
            deliveryGoalsLoading={deliveryGoalsLoading}
            discoveryChecklistItems={discoveryChecklistItems}
            discoveryGoalsLoading={discoveryGoalsLoading}
            goalTaskIds={goalTaskIds}
            goalsLoading={goalsLoading}
            loading={loading}
            selectedSprintId={selectedSprintId}
            sprintInfo={sprintInfo}
            sprints={sprints}
            sprintsLoading={sprintsLoading}
            tasksReloading={reloadTasksPending}
            onGoalsUpdate={onGoalsUpdate}
            onSprintChange={onSprintChange}
            onTasksReload={onTasksReload}
          />
        </div>
      )}

      {activeTab === 'burndown' && (
        <BurndownChart
          boardId={selectedBoardId}
          goalTaskIdsForTiles={goalTaskIds}
          sprintId={selectedSprintId}
          sprintTasksForTiles={tasksPending ? undefined : tasks}
          sprints={sprints}
          sprintsLoading={sprintsLoading}
          onSprintChange={onSprintChange}
        />
      )}
    </>
  );
}
