'use client';

import type { SprintInfo, SprintListItem, ChecklistItem } from '@/types/tracker';

import { observer } from 'mobx-react-lite';

import { useSprintPlannerViewModel } from './SprintPlanner/hooks/useSprintPlannerViewModel';
import { SprintPlannerView } from './SprintPlanner/SprintPlannerView';

interface SprintPlannerProps {
  checklistDone?: number;
  checklistTotal?: number;
  deliveryChecklistItems?: ChecklistItem[];
  deliveryGoalsLoading?: boolean;
  /** Для `/demo/planner`: UUID организации в БД для загрузки правил интеграции без активного tenant. */
  demoPlannerRulesOrganizationId?: string;
  discoveryChecklistItems?: ChecklistItem[];
  discoveryGoalsLoading?: boolean;
  goalsLoading?: boolean;
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
  onGoalsUpdate?: () => void;
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
  checklistDone = 0,
  checklistTotal = 0,
  deliveryChecklistItems = [],
  deliveryGoalsLoading = false,
  discoveryChecklistItems = [],
  discoveryGoalsLoading = false,
  goalTaskIds = [],
  goalsLoading = false,
  onGoalsUpdate,
  onTasksReload,
  tasksReloading = false,
  demoPlannerRulesOrganizationId,
  lockedBoardId,
}: SprintPlannerProps) {
  const viewModel = useSprintPlannerViewModel({
    checklistDone,
    checklistTotal,
    deliveryChecklistItems,
    deliveryGoalsLoading,
    demoPlannerRulesOrganizationId,
    discoveryChecklistItems,
    discoveryGoalsLoading,
    goalTaskIds,
    goalsLoading,
    lockedBoardId,
    onGoalsUpdate,
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
