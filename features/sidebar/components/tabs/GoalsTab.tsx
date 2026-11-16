import type { SprintInfo } from '@/types/tracker';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { SprintActions } from '@/features/sidebar/components/SprintActions';
import { SprintGoalsSection } from '@/features/sidebar/components/SprintGoalsSection';
import { submitStartSprint } from '@/features/sidebar/components/tabs/goalsTabStartSprintHelpers';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';
import { useGoalsTab } from '@/features/sidebar/hooks/useGoalsTab';
import { FinishSprintModal } from '@/features/sprint/components/FinishSprintModal';
import { useSprintGoalPlanRows } from '@/features/sprint/hooks/useSprintGoalPlanRows';
import { patchSprintInSprintsQueries } from '@/features/sprint/hooks/useSprints';
import { patchSprintInfoInTasksQueries } from '@/features/task/hooks/useTasks';

export function GoalsTab() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const {
    canEdit,
    deliveryChecklistItems,
    deliveryGoalsLoading,
    deliveryUpdatingItems,
    discoveryChecklistItems,
    discoveryGoalsLoading,
    discoveryUpdatingItems,
    goalsLoading,
    selectedBoardId = null,
    selectedSprintId = null,
    sprintInfo,
    sprints,
    goalsTasks: tasks,
    onCheckboxChangeDelivery,
    onCheckboxChangeDiscovery,
    onAddDeliveryGoal,
    onAddDiscoveryGoal,
    onEditDeliveryGoal,
    onEditDiscoveryGoal,
    onDeleteDeliveryGoal,
    onDeleteDiscoveryGoal,
    onTasksReload,
  } = useTaskSidebar();
  const deliveryGoalsTab = useGoalsTab({
    canEdit,
    checklistItems: deliveryChecklistItems,
    onAddGoal: onAddDeliveryGoal,
    onDeleteGoal: onDeleteDeliveryGoal,
    onEditGoal: onEditDeliveryGoal,
  });

  const discoveryGoalsTab = useGoalsTab({
    canEdit,
    checklistItems: discoveryChecklistItems,
    onAddGoal: onAddDiscoveryGoal,
    onDeleteGoal: onDeleteDiscoveryGoal,
    onEditGoal: onEditDiscoveryGoal,
  });

  const goalPlanRows = useSprintGoalPlanRows({
    boardId: selectedBoardId,
    sprintId: selectedSprintId,
    sprintWindow: sprintInfo,
  });
  const planRowOptions = goalPlanRows.ready ? goalPlanRows.options : null;

  const { confirm, DialogComponent: startSprintConfirmDialog } = useConfirmDialog();

  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [showFinishSprintModal, setShowFinishSprintModal] = useState(false);

  const handleSprintStatusUpdated = useCallback((updatedSprint: SprintInfo) => {
    patchSprintInfoInTasksQueries(queryClient, updatedSprint);
    patchSprintInSprintsQueries(queryClient, updatedSprint);
  }, [queryClient]);

  const handleFinishSprint = () => {
    setShowFinishSprintModal(true);
  };

  const canStartSprint = sprintInfo?.status === 'draft' || sprintInfo?.status === 'Draft';
  const canFinishSprint = sprintInfo?.status === 'in_progress' || sprintInfo?.status === 'In Progress';

  const handleStartSprintSubmit = async () => {
    if (!sprintInfo) return;

    await submitStartSprint({
      confirm,
      onSprintStatusUpdated: handleSprintStatusUpdated,
      onTasksReload,
      setIsChangingStatus,
      sprintInfo,
      t,
    });
  };

  const isLoading = goalsLoading || deliveryGoalsLoading || discoveryGoalsLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto pt-14">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon className="animate-spin h-8 w-8 text-blue-600" name="spinner" />
          </div>
        ) : (
          <>
            <SprintGoalsSection
              canEdit={canEdit}
              first
              goalType="delivery"
              items={deliveryChecklistItems}
              planRowOptions={planRowOptions}
              sprintId={selectedSprintId}
              tab={deliveryGoalsTab}
              updatingItems={deliveryUpdatingItems}
              onCheckboxChange={onCheckboxChangeDelivery}
              onPlanRowChange={(itemId, planRow) => goalPlanRows.setPlanRow('delivery', itemId, planRow)}
            />
            <SprintGoalsSection
              canEdit={canEdit}
              goalType="discovery"
              items={discoveryChecklistItems}
              planRowOptions={planRowOptions}
              sprintId={selectedSprintId}
              tab={discoveryGoalsTab}
              updatingItems={discoveryUpdatingItems}
              onCheckboxChange={onCheckboxChangeDiscovery}
              onPlanRowChange={(itemId, planRow) => goalPlanRows.setPlanRow('discovery', itemId, planRow)}
            />
          </>
        )}
      </div>

      <SprintActions
        canFinishSprint={canFinishSprint}
        canStartSprint={canStartSprint}
        isChangingStatus={isChangingStatus}
        onFinishSprint={handleFinishSprint}
        onStartSprint={handleStartSprintSubmit}
      />

      <FinishSprintModal
        goalTasks={[
          ...(deliveryChecklistItems.length > 0 ? [{ id: 'delivery', checklistItems: deliveryChecklistItems, source: 'sprint_goals' as const }] : []),
          ...(discoveryChecklistItems.length > 0 ? [{ id: 'discovery', checklistItems: discoveryChecklistItems, source: 'sprint_goals' as const }] : []),
        ]}
        isOpen={showFinishSprintModal}
        sprintInfo={sprintInfo ?? null}
        sprints={sprints}
        tasks={tasks}
        onClose={() => setShowFinishSprintModal(false)}
        onSprintStatusChange={handleSprintStatusUpdated}
        onTasksReload={onTasksReload}
      />
      {startSprintConfirmDialog}
      {deliveryGoalsTab.DialogComponent}
      {discoveryGoalsTab.DialogComponent}
    </div>
  );
}
