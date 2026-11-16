'use client';

import type { useGoalsTab } from '@/features/sidebar/hooks/useGoalsTab';
import type { GoalPlanRowOption, SprintGoalPlanRow } from '@/lib/sprintGoals/sprintGoalPlanRow';
import type { ChecklistItem } from '@/types/tracker';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { GoalsList } from '@/features/sidebar/components/GoalsList';

interface SprintGoalsSectionProps {
  canEdit: boolean;
  /** Первая секция: без линии сверху. */
  first?: boolean;
  goalType: 'delivery' | 'discovery';
  items: Array<ChecklistItem & { planRow?: SprintGoalPlanRow | null }>;
  /** Строки квартального плана для привязки цели (QG5); null — ещё грузятся. */
  planRowOptions: readonly GoalPlanRowOption[] | null;
  sprintId: number | null;
  /** Правка, добавление и удаление целей этой секции (`useGoalsTab`). */
  tab: ReturnType<typeof useGoalsTab>;
  updatingItems: Set<string>;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  onPlanRowChange: (itemId: string, planRow: SprintGoalPlanRow | null) => void;
}

/**
 * Цели спринта одного типа (delivery или discovery): заголовок, список с правкой и «Добавить цель».
 * Одна секция для сайдбара доски спринта и для целей спринта на доске квартала.
 */
export function SprintGoalsSection({
  canEdit,
  first = false,
  goalType,
  items,
  planRowOptions,
  sprintId,
  tab,
  updatingItems,
  onCheckboxChange,
  onPlanRowChange,
}: SprintGoalsSectionProps) {
  const { t } = useI18n();
  const idle = canEdit && !tab.newGoalId && !tab.editingId;
  return (
    <>
      <div
        className={`flex flex-shrink-0 items-center gap-2 px-4 pt-4 ${first ? '' : 'border-t border-gray-200 dark:border-gray-700'}`}
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {t(goalType === 'delivery' ? 'sidebar.goalsTab.deliveryGoalsHeading' : 'sidebar.goalsTab.discoveryGoalsHeading')}
        </h2>
        {idle && items.length === 0 && (
          <HeaderIconButton
            aria-label={t('sidebar.goalsTab.addGoalAria')}
            className="h-7 w-7"
            disabled={tab.isAdding}
            title={t('sidebar.goalsTab.addGoalAria')}
            type="button"
            onClick={tab.handleAddNewGoal}
          >
            <Icon className="h-4 w-4" name="plus" />
          </HeaderIconButton>
        )}
      </div>
      <div className="flex-shrink-0">
        <GoalsList
          canEdit={canEdit}
          checklistItems={items}
          deletingItems={tab.deletingItems}
          editingId={tab.editingId}
          editingText={tab.editingText}
          goalType={goalType}
          isAdding={tab.isAdding}
          newGoalId={tab.newGoalId}
          planRowOptions={planRowOptions}
          sprintId={sprintId}
          updatingItems={updatingItems}
          onCancelEdit={tab.handleCancelEdit}
          onCheckboxChange={onCheckboxChange}
          onDeleteGoal={tab.handleDeleteGoal}
          onPlanRowChange={onPlanRowChange}
          onSaveEdit={tab.handleSaveEdit}
          onStartEdit={tab.handleStartEdit}
          onTextChange={tab.setEditingText}
        />
      </div>
      {idle && items.length > 0 && (
        <div className={`flex-shrink-0 px-4 pt-1 ${first ? 'pb-2' : 'pb-4'}`}>
          <Button
            className="-mx-1.5 -my-0.5 h-auto min-h-0 gap-1.5 px-1.5 py-0.5 text-sm font-normal text-gray-600 hover:!bg-black/10 dark:text-gray-400 dark:hover:!bg-white/10 dark:hover:!text-gray-100"
            disabled={tab.isAdding}
            type="button"
            variant="ghost"
            onClick={tab.handleAddNewGoal}
          >
            <Icon className="h-4 w-4" name="plus" />
            {t('sidebar.goalsTab.addGoal')}
          </Button>
        </div>
      )}
    </>
  );
}
