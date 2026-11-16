'use client';

import type { QuarterlyPlanSprint } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useQueryClient } from '@tanstack/react-query';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { ResizableSidebar } from '@/components/ResizableSidebar';
import { useI18n } from '@/contexts/LanguageContext';
import { SprintGoalsSection } from '@/features/sidebar/components/SprintGoalsSection';
import { useGoalsTab } from '@/features/sidebar/hooks/useGoalsTab';
import { useSprintGoalManagement } from '@/features/sprint/hooks/useSprintGoalManagement';
import { useSprintGoalPlanRows } from '@/features/sprint/hooks/useSprintGoalPlanRows';
import { useSprintGoals } from '@/features/sprint/hooks/useSprintGoals';
import { useQuarterHistorySidebarWidthStorage } from '@/hooks/useLocalStorage';

interface QuarterlyPlanSprintGoalsProps {
  /** Спринт и доска его команды; null — сайдбар закрыт. */
  target: { boardId: number; sprint: QuarterlyPlanSprint } | null;
  onClose: () => void;
}

const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 480;

/**
 * Цели спринта на доске квартала (QG13): тот же список, что в сайдбаре доски спринта, — отметка «выполнено»,
 * правка, добавление, удаление и привязка к строке плана. Сайдбар встаёт рядом с доской, как история версий.
 */
export function QuarterlyPlanSprintGoals({ target, onClose }: QuarterlyPlanSprintGoalsProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [width, setWidth] = useQuarterHistorySidebarWidthStorage(320);
  const sprintId = target?.sprint.id ?? null;
  const boardId = target?.boardId ?? null;
  const delivery = useSprintGoals(sprintId, 'delivery');
  const discovery = useSprintGoals(sprintId, 'discovery');
  const deliveryManagement = useSprintGoalManagement({ boardId, goalType: 'delivery', queryClient, sprintId });
  const discoveryManagement = useSprintGoalManagement({ boardId, goalType: 'discovery', queryClient, sprintId });
  const deliveryItems = delivery.data?.checklistItems ?? [];
  const discoveryItems = discovery.data?.checklistItems ?? [];
  const deliveryTab = useGoalsTab({
    canEdit: true,
    checklistItems: deliveryItems,
    onAddGoal: deliveryManagement.handleAddGoal,
    onDeleteGoal: deliveryManagement.handleDeleteGoal,
    onEditGoal: deliveryManagement.handleEditGoal,
  });
  const discoveryTab = useGoalsTab({
    canEdit: true,
    checklistItems: discoveryItems,
    onAddGoal: discoveryManagement.handleAddGoal,
    onDeleteGoal: discoveryManagement.handleDeleteGoal,
    onEditGoal: discoveryManagement.handleEditGoal,
  });
  const planRows = useSprintGoalPlanRows({ boardId, sprintId, sprintWindow: target?.sprint ?? null });
  const planRowOptions = planRows.ready ? planRows.options : null;
  const loading = delivery.isLoading || discovery.isLoading;
  const check = (management: typeof deliveryManagement) => (itemId: string, checked: boolean) => {
    management.handleCheckboxChange(itemId, checked).catch(() => undefined);
  };

  return (
    <ResizableSidebar
      chrome="island"
      contentClassName="flex flex-col overflow-y-auto"
      headerActions={
        <HeaderIconButton title={t('quarterlyPlan.goals.close')} onClick={onClose}>
          <Icon className="h-4 w-4" name="x" />
        </HeaderIconButton>
      }
      hideClosedHandle
      isOpen={target !== null}
      maxWidth={SIDEBAR_MAX_WIDTH}
      minWidth={SIDEBAR_MIN_WIDTH}
      resizeHandleSide="left"
      title={target ? t('quarterlyPlan.goals.title', { sprint: target.sprint.name }) : ''}
      // Ширина не уже минимальной: сохранённая ширина могла остаться от стягивания до закрытия.
      width={Math.max(SIDEBAR_MIN_WIDTH, width)}
      onToggle={onClose}
      onWidthChange={setWidth}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Icon className="h-6 w-6 animate-spin text-blue-600" name="spinner" />
        </div>
      ) : (
        <>
          <SprintGoalsSection
            canEdit
            first
            goalType="delivery"
            items={deliveryItems}
            planRowOptions={planRowOptions}
            sprintId={sprintId}
            tab={deliveryTab}
            updatingItems={deliveryManagement.updatingItems}
            onCheckboxChange={check(deliveryManagement)}
            onPlanRowChange={(itemId, planRow) => planRows.setPlanRow('delivery', itemId, planRow)}
          />
          <SprintGoalsSection
            canEdit
            goalType="discovery"
            items={discoveryItems}
            planRowOptions={planRowOptions}
            sprintId={sprintId}
            tab={discoveryTab}
            updatingItems={discoveryManagement.updatingItems}
            onCheckboxChange={check(discoveryManagement)}
            onPlanRowChange={(itemId, planRow) => planRows.setPlanRow('discovery', itemId, planRow)}
          />
        </>
      )}
      {deliveryTab.DialogComponent}
      {discoveryTab.DialogComponent}
    </ResizableSidebar>
  );
}
