'use client';

import type { QuarterRowLevel } from '../quarterlyPlanBoardModel';
import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { epicTitle, isEpicDone } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import { QUARTER_ROW_ACTION_CLASS } from '../quarterlyPlanBoardModel';

import { QuarterlyPlanDraftItemToolbar } from './QuarterlyPlanDraftItemToolbar';
import { QuarterlyPlanDraftMark } from './QuarterlyPlanDraftMark';
import { QuarterlyPlanIssueKey } from './QuarterlyPlanIssueKey';
import { QuarterlyPlanSortHandle } from './QuarterlyPlanSortHandle';

/** Эпик — полужирный и в полный цвет, задача — мельче и тише: уровни различаются не только отступом. */
const TITLE_CLASS = {
  epic: 'text-sm font-medium text-gray-900 dark:text-gray-100',
  task: 'text-[13px] text-gray-600 dark:text-gray-300',
};

/** Задачи эпика: сколько их и раскрыт ли список (QT4). */
export interface QuarterlyPlanEpicTasks {
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

interface QuarterlyPlanEpicHeaderProps {
  epic: QuarterlyPlanEpic;
  level: QuarterRowLevel;
  /** У задачи не задаётся: под задачей задач нет (QT1). */
  tasks?: QuarterlyPlanEpicTasks;
  /** Ни одной полосы — ни у строки, ни у её задач (QB6): пометка у названия, а не на таймлайне. */
  unplanned: boolean;
}

/**
 * Название строки эпика или задачи с её управлением: ручка порядка, стрелка и число задач, ключ трекера,
 * пометка черновика, «+ задача» и меню действий.
 */
export const QuarterlyPlanEpicHeader = observer(function QuarterlyPlanEpicHeader({ epic, level, tasks, unplanned }: QuarterlyPlanEpicHeaderProps) {
  const { t } = useI18n();
  const { openRow: onRowMenu } = useQuarterlyPlanBoard().menu;
  const { trackerEpics } = useQuarterPlanView();
  /** Готовый эпик уходит на второй план: приглушён и зачёркнут (QE8). */
  const done = isEpicDone(epic, trackerEpics);
  const title = epicTitle(epic, trackerEpics);
  const hasTasks = tasks !== undefined && tasks.count > 0;
  const taskCountLabel = t('quarterlyPlan.taskCount', { count: tasks?.count ?? 0 });
  const menu = (kind: 'addTask' | 'epic') => (event: { clientX: number; clientY: number }) =>
    onRowMenu({ id: epic.id, kind }, { x: event.clientX, y: event.clientY });

  return (
    <>
      <QuarterlyPlanSortHandle id={epic.id} level={level} />
      {hasTasks ? (
        <button
          aria-expanded={tasks.expanded}
          aria-label={taskCountLabel}
          className="absolute left-5 flex h-6 w-5 cursor-pointer items-center justify-center rounded-md text-ds-text-muted transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
          type="button"
          onClick={tasks.onToggle}
        >
          <Icon className="h-3.5 w-3.5" name={tasks.expanded ? 'chevron-down' : 'chevron-right'} />
        </button>
      ) : null}
      <OverflowTooltip content={title}>
        <span
          className={`truncate ${TITLE_CLASS[level === 'task' ? 'task' : 'epic']} ${
            done ? '!font-normal !text-ds-text-muted line-through opacity-70' : ''
          }`}
        >
          {title}
        </span>
      </OverflowTooltip>
      {epic.issueKey ? <QuarterlyPlanIssueKey issueKey={epic.issueKey} /> : null}
      {hasTasks && !tasks.expanded ? (
        <span
          className="shrink-0 rounded-full bg-black/[0.06] px-1.5 text-xs tabular-nums text-ds-text-muted dark:bg-white/10"
          title={taskCountLabel}
        >
          {tasks.count}
        </span>
      ) : null}
      {unplanned ? (
        <span
          className="shrink-0 rounded border border-dashed border-gray-300 px-1 text-[11px] leading-4 text-ds-text-muted dark:border-gray-600"
          title={t('quarterlyPlan.unplannedHint')}
        >
          {t('quarterlyPlan.unplanned')}
        </span>
      ) : null}
      <QuarterlyPlanDraftMark id={epic.id} />
      <QuarterlyPlanDraftItemToolbar id={epic.id} placement="flow" />
      <span className="flex-1" />
      {tasks ? (
        <HeaderIconButton className={QUARTER_ROW_ACTION_CLASS} title={t('quarterlyPlan.addTask')} onClick={menu('addTask')}>
          <Icon className="h-3.5 w-3.5" name="plus" />
        </HeaderIconButton>
      ) : null}
      <HeaderIconButton className={QUARTER_ROW_ACTION_CLASS} title={t('quarterlyPlan.rowActions')} onClick={menu('epic')}>
        <Icon className="h-3.5 w-3.5" name="dots-horizontal" />
      </HeaderIconButton>
    </>
  );
});
