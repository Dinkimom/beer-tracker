'use client';

import type { SprintTab } from '@/components/PageHeader';

import { useQueryClient } from '@tanstack/react-query';
import { reaction } from 'mobx';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PageHeader } from '@/components/PageHeader';
import { PhaseCardColorSchemeProvider } from '@/components/PhaseCardColorSchemeContext';
import { useI18n } from '@/contexts/LanguageContext';
import { BacklogPage } from '@/features/backlog/components/BacklogPage';
import { useBoards } from '@/features/board/hooks/useBoards';
import { BurndownChart } from '@/features/burndown/components/BurndownChart';
import { RetroPage } from '@/features/retro/components/RetroPage';
import { SprintMetricsPage } from '@/features/sprint-metrics/components/SprintMetricsPage';
import { SprintPlanner } from '@/features/sprint/components/SprintPlanner';
import { useSprintGoals } from '@/features/sprint/hooks/useSprintGoals';
import { useSprints } from '@/features/sprint/hooks/useSprints';
import { useReloadTasks } from '@/features/task/hooks/useTaskMutations';
import { useTasks } from '@/features/task/hooks/useTasks';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { productSessionQueryKey } from '@/hooks/useProductTenantOrganizations';
import { demoBeerTrackerApi } from '@/lib/demo/demoBeerTrackerApi';
import { DEMO_PLANNER_NOW } from '@/lib/demo/demoIds';
import { useRootStore } from '@/lib/layers';
import { resolveValidatedSprintId } from '@/lib/planner/resolveValidatedSprintId';
import { setPlannerBeerTrackerApiOverride } from '@/lib/plannerBeerTrackerApiOverride';
import { setPlannerNowOverride } from '@/utils/plannerClock';

function isDemoPositionsGatePending(params: {
  positionsLoadPending: boolean;
  positionsSettledSprintId: number | null;
  selectedSprintId: number | null;
}): boolean {
  if (params.selectedSprintId == null) return false;
  if (params.positionsLoadPending) return true;
  return params.positionsSettledSprintId !== params.selectedSprintId;
}

function useDemoSprintPositionsPending(sprintId: number | null): boolean {
  const { taskPositions } = useRootStore();
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      reaction(
        () => [taskPositions.positionsLoadPending, taskPositions.positionsSettledSprintId].join(':'),
        onStoreChange
      ),
    [taskPositions]
  );
  const getSnapshot = useCallback(
    () =>
      isDemoPositionsGatePending({
        positionsLoadPending: taskPositions.positionsLoadPending,
        positionsSettledSprintId: taskPositions.positionsSettledSprintId,
        selectedSprintId: sprintId,
      }),
    [sprintId, taskPositions]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

interface DemoPlannerClientProps {
  boardId: number;
  productOrganizationId: string;
}

export default function DemoPlannerClient({ boardId, productOrganizationId }: DemoPlannerClientProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  /**
   * Must run before useQuery effects (boards, sprints), otherwise the first fetch goes to `/api/*`
   * without the fixture adapter. Empty deps: do not clear override on queryClient identity churn.
   */
  useLayoutEffect(() => {
    setPlannerBeerTrackerApiOverride(demoBeerTrackerApi);
    setPlannerNowOverride(DEMO_PLANNER_NOW);
    return () => {
      setPlannerBeerTrackerApiOverride(null);
      setPlannerNowOverride(null);
      // Drop demo + any accidentally poisoned shared product-session cache.
      queryClient.removeQueries({ queryKey: productSessionQueryKey });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- override must be stable for the demo page lifetime
  }, []);

  const { getBoardSelectorLabel, isLoading: boardsLoading } = useBoards();
  const [activeBoardId, setActiveBoardId] = useState(boardId);
  const [activeTab, setActiveTab] = useState<SprintTab>('board');
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [shellReady, setShellReady] = useState(false);

  useEffect(() => {
    setActiveBoardId(boardId);
  }, [boardId]);

  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(activeBoardId);

  useEffect(() => {
    queueMicrotask(() => {
      setShellReady(true);
    });
  }, []);

  useEffect(() => {
    setSelectedSprintId((cur) => resolveValidatedSprintId(cur, sprints));
  }, [sprints]);

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isPending: tasksPending,
    error: tasksError,
  } = useTasks(selectedSprintId, activeBoardId);

  const tasks = tasksData?.tasks ?? [];
  const sprintInfo = tasksData?.sprintInfo ?? null;

  const shouldLoadGoals = selectedSprintId != null;
  const { data: deliveryGoalsData, isLoading: deliveryGoalsLoading } = useSprintGoals(
    shouldLoadGoals ? selectedSprintId : null,
    'delivery'
  );
  const { data: discoveryGoalsData, isLoading: discoveryGoalsLoading } = useSprintGoals(
    shouldLoadGoals ? selectedSprintId : null,
    'discovery'
  );

  const deliveryChecklistItems = deliveryGoalsData?.checklistItems ?? [];
  const discoveryChecklistItems = discoveryGoalsData?.checklistItems ?? [];
  const checklistDone =
    (deliveryGoalsData?.checklistDone ?? 0) + (discoveryGoalsData?.checklistDone ?? 0);
  const checklistTotal =
    (deliveryGoalsData?.checklistTotal ?? 0) + (discoveryGoalsData?.checklistTotal ?? 0);
  const goalsLoading = deliveryGoalsLoading || discoveryGoalsLoading;

  const goalTaskIds = tasks.filter((task) => task.type === 'goal').map((task) => task.id);

  const reloadTasksMutation = useReloadTasks(selectedSprintId, activeBoardId);

  const { taskPositions } = useRootStore();
  const boardTabSprintId = activeTab === 'board' ? selectedSprintId : null;
  const positionsPending = useDemoSprintPositionsPending(boardTabSprintId);

  useEffect(() => {
    if (boardTabSprintId == null) return;
    taskPositions.loadSprint(boardTabSprintId).catch((err) => {
      console.error('Error loading demo task positions:', err);
    });
  }, [boardTabSprintId, taskPositions]);

  const { isFetched: plannerIntegrationRulesFetched } = usePlannerIntegrationRules(
    productOrganizationId
  );

  const handleTasksReload = (options?: { showToast?: boolean }) => {
    reloadTasksMutation.mutate(options);
  };

  const handleGoalsUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sprintGoals'] });
  }, [queryClient]);

  const handleSprintChange = useCallback((sprintId: number | null) => {
    setSelectedSprintId(sprintId);
  }, []);

  const handleBoardChange = useCallback((nextBoardId: number | null) => {
    if (nextBoardId == null) return;
    setActiveBoardId(nextBoardId);
    setSelectedSprintId(null);
  }, []);

  const handleTabChange = useCallback((tab: SprintTab) => {
    setActiveTab(tab);
  }, []);

  const boardName = useMemo(
    () => getBoardSelectorLabel(activeBoardId),
    [activeBoardId, getBoardSelectorLabel]
  );

  let sprintDataErrorMessage: string | null = null;
  if (tasksError instanceof Error) {
    sprintDataErrorMessage = tasksError.message;
  }

  const waitForTasksOnBoardTab = activeTab === 'board' && selectedSprintId != null && tasksPending;
  const waitForSprintsOnBoardTab = activeTab === 'board' && sprintsLoading;
  const waitForPlannerRulesOnBoardTab = activeTab === 'board' && !plannerIntegrationRulesFetched;
  const waitForGoalsOnBoardTab = activeTab === 'board' && selectedSprintId != null && goalsLoading;
  const waitForTaskPositionsOnBoardTab = activeTab === 'board' && positionsPending;

  const showFullScreenLoading =
    !shellReady ||
    boardsLoading ||
    waitForTasksOnBoardTab ||
    waitForSprintsOnBoardTab ||
    waitForPlannerRulesOnBoardTab ||
    waitForGoalsOnBoardTab ||
    waitForTaskPositionsOnBoardTab;

  if (sprintDataErrorMessage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-600">
          {t('demoPlanner.loadErrorPrefix')} {sprintDataErrorMessage}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PhaseCardColorSchemeProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-ds-canvas">
          <PageHeader
            activeTab={activeTab}
            boardName={boardName}
            selectedBoardId={activeBoardId}
            onBoardChange={handleBoardChange}
            onTabChange={handleTabChange}
          />
          {/* Same shell as MainPageClient: canvas + padded content frame under the header. */}
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-0">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {activeTab === 'backlog' && (
                <BacklogPage
                  lockedBoardId={activeBoardId}
                  sprints={sprints}
                  sprintsLoading={sprintsLoading}
                />
              )}
              {activeTab === 'board' && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <SprintPlanner
                    checklistDone={checklistDone}
                    checklistTotal={checklistTotal}
                    deliveryChecklistItems={deliveryChecklistItems}
                    deliveryGoalsLoading={deliveryGoalsLoading}
                    demoPlannerRulesOrganizationId={productOrganizationId}
                    discoveryChecklistItems={discoveryChecklistItems}
                    discoveryGoalsLoading={discoveryGoalsLoading}
                    goalTaskIds={goalTaskIds}
                    goalsLoading={goalsLoading}
                    loading={tasksLoading}
                    lockedBoardId={activeBoardId}
                    selectedSprintId={selectedSprintId}
                    sprintInfo={sprintInfo}
                    sprints={sprints}
                    sprintsLoading={sprintsLoading}
                    tasksReloading={reloadTasksMutation.isPending}
                    onGoalsUpdate={handleGoalsUpdate}
                    onSprintChange={handleSprintChange}
                    onTasksReload={handleTasksReload}
                  />
                </div>
              )}
              {activeTab === 'burndown' && (
                <BurndownChart
                  boardId={activeBoardId}
                  goalTaskIdsForTiles={goalTaskIds}
                  sprintId={selectedSprintId}
                  sprintTasksForTiles={tasksPending ? undefined : tasks}
                  sprints={sprints}
                  sprintsLoading={sprintsLoading}
                  onSprintChange={handleSprintChange}
                />
              )}
              {activeTab === 'metrics' && <SprintMetricsPage boardId={activeBoardId} />}
              {activeTab === 'retro' && (
                <RetroPage
                  boardId={activeBoardId}
                  goalTaskIds={goalTaskIds}
                  selectedSprintId={selectedSprintId}
                  sprints={sprints}
                  sprintsLoading={sprintsLoading}
                  tasks={tasks}
                  tasksPending={tasksPending}
                  onSprintChange={handleSprintChange}
                />
              )}
            </div>
          </div>
          <LoadingOverlay isVisible={showFullScreenLoading} message={t('demoPlanner.loading')} />
        </div>
      </PhaseCardColorSchemeProvider>
    </ErrorBoundary>
  );
}
