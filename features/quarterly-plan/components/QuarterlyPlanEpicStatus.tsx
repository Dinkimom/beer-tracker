'use client';

import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { TaskStatusSelect } from '@/features/task/components/TaskStatusSelect';
import { trackerEpicOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import { QUARTER_STATUS_PALETTE_KEY } from '../quarterlyPlanBoardModel';

interface QuarterlyPlanEpicStatusProps {
  epic: QuarterlyPlanEpic;
}

/**
 * Статус строки (QE7). У привязанной — статус задачи в трекере; по клику — её переходы, выбранный
 * переход делается в трекере. У своей — кнопка с выбором из пяти.
 */
export const QuarterlyPlanEpicStatus = observer(function QuarterlyPlanEpicStatus({ epic }: QuarterlyPlanEpicStatusProps) {
  const { t } = useI18n();
  const { menu, onTrackerStatusChange } = useQuarterlyPlanBoard();
  const { openStatus: onStatusClick } = menu;
  const { trackerEpics } = useQuarterPlanView();
  const tracked = trackerEpicOf(epic, trackerEpics);
  const { issueKey } = epic;
  if (issueKey && tracked?.statusColorKey) {
    return (
      <span className="shrink-0" title={t('quarterlyPlan.statusFromTracker')}>
        <TaskStatusSelect
          bare
          fullWidth={false}
          task={{
            id: issueKey,
            name: tracked.title,
            originalStatus: tracked.statusColorKey,
            originalStatusDisplay: tracked.statusDisplay,
            statusColorKey: tracked.statusColorKey,
            type: 'task',
          }}
          onTransitionSelect={(transitionId, statusKey, statusDisplay) =>
            onTrackerStatusChange(issueKey, transitionId, statusKey, statusDisplay)
          }
        />
      </span>
    );
  }
  // Привязана, но трекер задачу не отдал (нет доступа, удалена): переходов взять неоткуда.
  if (issueKey) {
    return (
      <span className="shrink-0" title={t('quarterlyPlan.statusFromTracker')}>
        <StatusTag label={t(`quarterlyPlan.status.${epic.status}`)} status={QUARTER_STATUS_PALETTE_KEY[epic.status]} />
      </span>
    );
  }
  return (
    <button
      aria-label={t('quarterlyPlan.changeStatus')}
      className="shrink-0 cursor-pointer rounded-md transition-all duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] active:brightness-90 dark:hover:brightness-125"
      type="button"
      onClick={(event) => onStatusClick(epic.id, { x: event.clientX, y: event.clientY })}
    >
      <StatusTag label={t(`quarterlyPlan.status.${epic.status}`)} status={QUARTER_STATUS_PALETTE_KEY[epic.status]} />
    </button>
  );
});
