'use client';

import type { QuarterRowGoalFlag } from '../quarterlyPlanBoardModel';

import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { useQuarterLaneHeight, useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { quarterNoteBoxStyle } from '../quarterlyPlanBoardModel';

interface QuarterlyPlanGoalFlagProps {
  flag: QuarterRowGoalFlag;
  lane: number;
  /** Где в строке начинаются дорожки заметок: флажки стоят в них же, раньше заметок. */
  topPx: number;
}

/**
 * Флажок целей спринта в строке плана (QG8): цели одного типа одного спринта, привязанные к строке. Стоит
 * на неделях спринта. Вид — как у полос: поставка сплошная, проработка пунктиром; все цели выполнены — зелёный.
 * Текст — первая цель, у нескольких — счётчик «выполнено/всего», весь список — в подсказке. Клик открывает цели спринта (QG13).
 */
export function QuarterlyPlanGoalFlag({ flag, lane, topPx }: QuarterlyPlanGoalFlagProps) {
  const { t } = useI18n();
  const { onSprintGoalsOpen, weeks } = useQuarterlyPlanBoard();
  const laneHeightPx = useQuarterLaneHeight();
  const done = flag.goals.filter((goal) => goal.done).length;
  const allDone = done === flag.goals.length;
  const [first] = flag.goals;
  const phase = t(`quarterlyPlan.phase.${flag.goalType}`);
  const label = t('quarterlyPlan.goals.flag', { done, phase, sprint: flag.sprint.name, total: flag.goals.length });
  const title = [label, ...flag.goals.map((goal) => `${goal.done ? '✓' : '○'} ${goal.text}`)].join('\n');
  const tone = allDone
    ? 'border-green-300 bg-green-50 text-green-900 hover:bg-green-100 active:bg-green-200 dark:border-green-700 dark:bg-green-900/40 dark:text-green-100 dark:hover:bg-green-900/60'
    : 'border-sky-300 bg-white text-gray-800 hover:bg-sky-50 active:bg-sky-100 dark:border-sky-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-sky-900/30';

  return (
    <button
      aria-label={label}
      className={`absolute flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border px-1.5 text-xs shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] ${
        flag.goalType === 'discovery' ? 'border-dashed' : ''
      } ${tone}`}
      data-quarter-goal-flag={flag.id}
      style={{
        ...quarterNoteBoxStyle({ rows: 1, startWeek: flag.startWeek, weeks: flag.weeks }, lane, topPx, weeks.length, laneHeightPx),
        zIndex: ZIndex.contentInteractive,
      }}
      title={title}
      type="button"
      onClick={() => onSprintGoalsOpen(flag.sprint, flag.boardId)}
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${allDone ? 'text-green-600 dark:text-green-300' : 'text-sky-600 dark:text-sky-300'}`}
        name={allDone ? 'check-circle' : 'target'}
      />
      <span className={`min-w-0 flex-1 truncate text-left ${first?.done && !allDone ? 'line-through opacity-60' : ''}`}>
        {first?.text}
      </span>
      {flag.goals.length > 1 ? (
        <span className="shrink-0 rounded bg-black/[0.06] px-1 font-medium tabular-nums dark:bg-white/10">
          {done}/{flag.goals.length}
        </span>
      ) : null}
    </button>
  );
}
