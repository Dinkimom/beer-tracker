import { startTransition, useEffect } from 'react';

import { useRootStore } from '@/lib/layers';
import { DELAYS } from '@/utils/constants';

import { usePlannerNotificationFocus } from '../../../hooks/usePlannerNotificationFocus';
import { useScrollToCurrentDay } from '../../../hooks/useScrollToCurrentDay';

import { useSprintPlannerSyntheticQaCleanup } from './useSprintPlannerSyntheticQaCleanup';
import { useTrackerSyncFailureToasts } from './useTrackerSyncFailureToasts';

type UseSprintPlannerBoardEffectsParams = Parameters<typeof useScrollToCurrentDay>[0] &
  Parameters<typeof useSprintPlannerSyntheticQaCleanup>[0] &
  Pick<Parameters<typeof usePlannerNotificationFocus>[0], 'setViewMode'> & {
    debouncedUpdateXarrow: () => void;
  };

/**
 * Побочные эффекты доски, которые ничего не отдают в разметку: тосты сбоев синхронизации,
 * чистка синтетических QA, сброс инструментов при смене режима, первая отрисовка стрелок,
 * сброс переходного UI при смене спринта, прокрутка к текущему дню и фокус по уведомлению.
 */
export function useSprintPlannerBoardEffects({
  debouncedUpdateXarrow,
  deletePosition,
  isMounted,
  scrollContainerRef,
  selectedSprintId,
  setViewMode,
  sprintInfo,
  sprints,
  taskPositions,
  tasks,
  testingFlowMode,
  viewMode,
}: UseSprintPlannerBoardEffectsParams): void {
  const { sprintPlannerUi } = useRootStore();

  useTrackerSyncFailureToasts();

  useSprintPlannerSyntheticQaCleanup({
    deletePosition,
    selectedSprintId,
    taskPositions,
    tasks,
    testingFlowMode,
  });

  useEffect(() => {
    if (viewMode === 'kanban') {
      sprintPlannerUi.tools.setSegmentEditTaskId(null);
      sprintPlannerUi.tools.setPlacementTool('cursor');
    }
    if (viewMode === 'features' && sprintPlannerUi.tools.placementTool === 'availability') {
      sprintPlannerUi.tools.setPlacementTool('cursor');
    }
  }, [viewMode, sprintPlannerUi]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedUpdateXarrow();
    }, DELAYS.UI_UPDATE);
    return () => clearTimeout(timeoutId);
  }, [debouncedUpdateXarrow]);

  useEffect(() => {
    startTransition(() => {
      sprintPlannerUi.clearTransientUiOnSprintChange();
    });
  }, [selectedSprintId, sprintPlannerUi]);

  useScrollToCurrentDay({
    isMounted,
    scrollContainerRef,
    selectedSprintId,
    sprintInfo,
    sprints,
    viewMode,
  });

  usePlannerNotificationFocus({
    isMounted,
    plannerDataReady: isMounted,
    scrollContainerRef,
    setViewMode,
    sprintPlannerUi,
    viewMode,
  });
}
