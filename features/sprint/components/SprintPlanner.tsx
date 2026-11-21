'use client';

import type { SprintInfo, SprintListItem } from '@/types/tracker';

import { observer } from 'mobx-react-lite';

import { useSprintPlannerViewModel } from './SprintPlanner/hooks/useSprintPlannerViewModel';
import { SprintPlannerView } from './SprintPlanner/SprintPlannerView';

interface SprintPlannerProps {
  /** Для `/demo/planner`: UUID организации в БД для загрузки правил интеграции без активного tenant. */
  demoPlannerRulesOrganizationId?: string;
  goalTaskIds?: string[];
  loading?: boolean;
  /**
   * Если задан — запросы данных планера (задачи, отпуска, кэш-ключи React Query и т.д.) идут на эту доску,
   * а не на `selectedBoardId` из localStorage основного планера.
   */
  lockedBoardId?: number;
  selectedSprintId: number | null;
  sprintInfo: SprintInfo | null;
  sprints: SprintListItem[];
  sprintsLoading?: boolean;
  /** Идёт перезагрузка задач по кнопке «Обновить задачи» */
  tasksReloading?: boolean;
  onSprintChange: (sprintId: number | null) => void;
  onTasksReload?: (options?: { showToast?: boolean }) => void;
}

export const SprintPlanner = observer(function SprintPlanner({
  sprintInfo,
  sprints,
  selectedSprintId,
  onSprintChange,
  loading: tasksLoading = false,
  sprintsLoading = false,
  goalTaskIds = [],
  onTasksReload,
  tasksReloading = false,
  demoPlannerRulesOrganizationId,
  lockedBoardId,
}: SprintPlannerProps) {
  const viewModel = useSprintPlannerViewModel({
    demoPlannerRulesOrganizationId,
    goalTaskIds,
    lockedBoardId,
    onSprintChange,
    onTasksReload,
    selectedSprintId,
    sprintInfo,
    sprints,
    sprintsLoading,
    tasksLoading,
    tasksReloading,
  });

  return <SprintPlannerView {...viewModel} />;
});
