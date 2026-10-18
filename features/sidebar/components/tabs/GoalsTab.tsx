import type { SprintInfo } from '@/types/tracker';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { Button } from '@/components/Button';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { GoalsList } from '@/features/sidebar/components/GoalsList';
import { SprintActions } from '@/features/sidebar/components/SprintActions';
import { submitStartSprint } from '@/features/sidebar/components/tabs/goalsTabStartSprintHelpers';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';
import { useGoalsTab } from '@/features/sidebar/hooks/useGoalsTab';
import { FinishSprintModal } from '@/features/sprint/components/FinishSprintModal';
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
            <div className="px-4 pt-4 flex-shrink-0 flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t('sidebar.goalsTab.deliveryGoalsHeading')}
              </h2>
              {canEdit && !deliveryGoalsTab.newGoalId && !deliveryGoalsTab.editingId && deliveryChecklistItems.length === 0 && (
                <HeaderIconButton
                  aria-label={t('sidebar.goalsTab.addGoalAria')}
                  className="h-7 w-7"
                  disabled={deliveryGoalsTab.isAdding}
                  title={t('sidebar.goalsTab.addGoalAria')}
                  type="button"
                  onClick={deliveryGoalsTab.handleAddNewGoal}
                >
                  <Icon className="h-4 w-4" name="plus" />
                </HeaderIconButton>
              )}
            </div>
            <div className="flex-shrink-0">
              <GoalsList
                canEdit={canEdit}
                checklistItems={deliveryChecklistItems}
                deletingItems={deliveryGoalsTab.deletingItems}
                editingId={deliveryGoalsTab.editingId}
                editingText={deliveryGoalsTab.editingText}
                goalType="delivery"
                isAdding={deliveryGoalsTab.isAdding}
                newGoalId={deliveryGoalsTab.newGoalId}
                sprintId={selectedSprintId}
                updatingItems={deliveryUpdatingItems}
                onCancelEdit={deliveryGoalsTab.handleCancelEdit}
                onCheckboxChange={onCheckboxChangeDelivery}
                onDeleteGoal={deliveryGoalsTab.handleDeleteGoal}
                onSaveEdit={deliveryGoalsTab.handleSaveEdit}
                onStartEdit={deliveryGoalsTab.handleStartEdit}
                onTextChange={deliveryGoalsTab.setEditingText}
              />
            </div>
            {canEdit && !deliveryGoalsTab.newGoalId && !deliveryGoalsTab.editingId && deliveryChecklistItems.length > 0 && (
              <div className="px-4 pb-2 pt-1 flex-shrink-0">
                <Button
                  className="-mx-1.5 -my-0.5 h-auto min-h-0 gap-1.5 px-1.5 py-0.5 text-sm font-normal text-gray-600 hover:!bg-black/10 dark:text-gray-400 dark:hover:!bg-white/10 dark:hover:!text-gray-100"
                  disabled={deliveryGoalsTab.isAdding}
                  type="button"
                  variant="ghost"
                  onClick={deliveryGoalsTab.handleAddNewGoal}
                >
                  <Icon className="h-4 w-4" name="plus" />
                  {t('sidebar.goalsTab.addGoal')}
                </Button>
              </div>
            )}
            {/* Цели Discovery */}
            <div className="px-4 pt-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t('sidebar.goalsTab.discoveryGoalsHeading')}
              </h2>
              {canEdit && !discoveryGoalsTab.newGoalId && !discoveryGoalsTab.editingId && discoveryChecklistItems.length === 0 && (
                <HeaderIconButton
                  aria-label={t('sidebar.goalsTab.addGoalAria')}
                  className="h-7 w-7"
                  disabled={discoveryGoalsTab.isAdding}
                  title={t('sidebar.goalsTab.addGoalAria')}
                  type="button"
                  onClick={discoveryGoalsTab.handleAddNewGoal}
                >
                  <Icon className="h-4 w-4" name="plus" />
                </HeaderIconButton>
              )}
            </div>
            <div className="flex-shrink-0">
              <GoalsList
                canEdit={canEdit}
                checklistItems={discoveryChecklistItems}
                deletingItems={discoveryGoalsTab.deletingItems}
                editingId={discoveryGoalsTab.editingId}
                editingText={discoveryGoalsTab.editingText}
                goalType="discovery"
                isAdding={discoveryGoalsTab.isAdding}
                newGoalId={discoveryGoalsTab.newGoalId}
                sprintId={selectedSprintId}
                updatingItems={discoveryUpdatingItems}
                onCancelEdit={discoveryGoalsTab.handleCancelEdit}
                onCheckboxChange={onCheckboxChangeDiscovery}
                onDeleteGoal={discoveryGoalsTab.handleDeleteGoal}
                onSaveEdit={discoveryGoalsTab.handleSaveEdit}
                onStartEdit={discoveryGoalsTab.handleStartEdit}
                onTextChange={discoveryGoalsTab.setEditingText}
              />
            </div>
            {canEdit && !discoveryGoalsTab.newGoalId && !discoveryGoalsTab.editingId && discoveryChecklistItems.length > 0 && (
              <div className="flex-shrink-0 px-4 pb-4 pt-1 dark:border-gray-700">
                <Button
                  className="-mx-1.5 -my-0.5 h-auto min-h-0 gap-1.5 px-1.5 py-0.5 text-sm font-normal text-gray-600 hover:!bg-black/10 dark:text-gray-400 dark:hover:!bg-white/10 dark:hover:!text-gray-100"
                  disabled={discoveryGoalsTab.isAdding}
                  type="button"
                  variant="ghost"
                  onClick={discoveryGoalsTab.handleAddNewGoal}
                >
                  <Icon className="h-4 w-4" name="plus" />
                  {t('sidebar.goalsTab.addGoal')}
                </Button>
              </div>
            )}
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
