'use client';

import type { SprintTab } from '@/components/PageHeader';
import type { Task } from '@/types';
import type { SprintInfo, SprintListItem } from '@/types/tracker';

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

const SprintMetricsPage = dynamic(
  () =>
    import('@/features/sprint-metrics/components/SprintMetricsPage').then(
      (mod) => mod.SprintMetricsPage
    ),
  { ssr: false }
);

const QuarterlyPlanPage = dynamic(
  () => import('@/features/quarterly-plan/QuarterlyPlanPage').then((mod) => mod.QuarterlyPlanPage),
  { ssr: false }
);

const RetroPage = dynamic(
  () => import('@/features/retro/components/RetroPage').then((mod) => mod.RetroPage),
  { ssr: false }
);

export interface MainPageClientSprintsContentProps {
  activeTab: SprintTab;
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
  onSprintChange: (sprintId: number | null) => void;
  onTasksReload: (options?: { showToast?: boolean }) => void;
}

export function MainPageClientSprintsContent({
  activeTab,
  goalTaskIds,
  loading,
  reloadTasksPending,
  selectedBoardId,
  selectedSprintId,
  sprintInfo,
  sprints,
  sprintsLoading,
  tasks,
  tasksPending,
  onSprintChange,
  onTasksReload,
}: MainPageClientSprintsContentProps) {
  return (
    <>
      {activeTab === 'backlog' && (
        <BacklogPage sprints={sprints} sprintsLoading={sprintsLoading} />
      )}

      {activeTab === 'board' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SprintPlanner
            goalTaskIds={goalTaskIds}
            loading={loading}
            selectedSprintId={selectedSprintId}
            sprintInfo={sprintInfo}
            sprints={sprints}
            sprintsLoading={sprintsLoading}
            tasksReloading={reloadTasksPending}
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

      {activeTab === 'metrics' && <SprintMetricsPage boardId={selectedBoardId} />}

      {/* План общий на организацию: доска и спринт его не меняют. */}
      {activeTab === 'quarter' && <QuarterlyPlanPage />}

      {activeTab === 'retro' && (
        <RetroPage
          boardId={selectedBoardId}
          goalTaskIds={goalTaskIds}
          selectedSprintId={selectedSprintId}
          sprints={sprints}
          sprintsLoading={sprintsLoading}
          tasks={tasks}
          tasksPending={tasksPending}
          onSprintChange={onSprintChange}
        />
      )}
    </>
  );
}
