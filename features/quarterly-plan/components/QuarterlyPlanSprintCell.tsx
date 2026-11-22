'use client';

import type { QuarterlyPlanSprint } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useSprintGoals } from '@/features/sprint/hooks/useSprintGoals';
import { formatSprintDisplayName } from '@/utils/sprintDisplayName';

import { useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import { QUARTER_ROW_HEIGHT_PX, QUARTER_STICKY_LABEL_LEFT } from '../quarterlyPlanBoardModel';

interface QuarterlyPlanSprintCellProps {
  boardId: number;
  /** Спринт идёт сейчас: ячейка выделена. */
  current: boolean;
  /** Ячейка начинается не с первой недели: слева граница. */
  divided: boolean;
  span: { startWeek: number; weeks: number };
  sprint: QuarterlyPlanSprint;
}

/**
 * Ячейка спринта в строке команды: номер спринта и кнопка его целей (QG13) — выполнено из всех или «Цели»,
 * если их ещё нет. Кнопка открывает цели спринта в сайдбаре. Ячейка — на всю высоту строки, подпись — в верхней
 * ленте и липнет к колонке.
 */
export const QuarterlyPlanSprintCell = observer(function QuarterlyPlanSprintCell({ boardId, current, divided, span, sprint }: QuarterlyPlanSprintCellProps) {
  const { t } = useI18n();
  const { onSprintGoalsOpen } = useQuarterlyPlanBoard();
  const { weeks } = useQuarterPlanView();
  const delivery = useSprintGoals(sprint.id, 'delivery').data?.checklistItems ?? [];
  const discovery = useSprintGoals(sprint.id, 'discovery').data?.checklistItems ?? [];
  const goals = [...delivery, ...discovery];
  const done = goals.filter((goal) => goal.checked).length;
  const allDone = goals.length > 0 && done === goals.length;
  return (
    <div
      className={`absolute inset-y-0 flex items-start justify-center px-2 text-[11px] ${divided ? 'border-l border-ds-border-subtle' : ''} ${
        current ? 'bg-blue-100 font-semibold text-blue-800 dark:bg-[#31496d] dark:text-blue-100' : 'text-ds-text-muted'
      }`}
      style={{
        left: `calc(${(span.startWeek / weeks.length) * 100}% - 1px)`,
        width: `${(span.weeks / weeks.length) * 100}%`,
      }}
    >
      {/* Номер спринта без названия команды — как в селекторе спринта планера; полное имя — в подсказке. */}
      <span
        className="sticky right-2 flex min-w-0 items-center gap-1.5"
        style={{ left: QUARTER_STICKY_LABEL_LEFT, height: QUARTER_ROW_HEIGHT_PX }}
      >
        <span className="truncate" title={sprint.name}>
          {formatSprintDisplayName(sprint.name)}
        </span>
        <button
          aria-label={t('quarterlyPlan.goals.open', { sprint: sprint.name })}
          className={`flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-md border px-1.5 font-medium tabular-nums transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] ${
            allDone
              ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100 active:bg-green-200 dark:border-green-700 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60'
              : 'border-black/10 bg-white/70 text-gray-700 hover:border-black/20 hover:bg-white active:bg-gray-100 dark:border-white/15 dark:bg-white/[0.06] dark:text-gray-200 dark:hover:bg-white/[0.12] dark:active:bg-white/[0.16]'
          }`}
          title={goals.length > 0 ? t('quarterlyPlan.goals.count', { done, total: goals.length }) : t('quarterlyPlan.goals.open', { sprint: sprint.name })}
          type="button"
          onClick={() => onSprintGoalsOpen(sprint, boardId)}
        >
          <Icon className="h-3 w-3" name={goals.length > 0 ? 'check' : 'plus'} />
          {goals.length > 0 ? `${done}/${goals.length}` : t('quarterlyPlan.goals.label')}
        </button>
      </span>
    </div>
  );
});
