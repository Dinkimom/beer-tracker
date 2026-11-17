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
  /** Где в строке начинаются дорожки: цели занимают верхние, полосы и заметки — под ними. */
  topPx: number;
}

/** Пилюля ниже дорожки: сверху и снизу остаётся воздух, и рядом с полосой она не выглядит ещё одной полосой. */
const PILL_INSET_PX = 4;

/**
 * Флажок целей спринта в строке плана (QG8): цели одного типа одного спринта, привязанные к строке.
 * Пилюля шириной по тексту (не шире спринта; в «Дни» — на всю ширину спринта) у начала спринта — своей формы и заливки, чтобы её не путали
 * с полосами. Тип — словом (Delivery / Discovery, как на доске спринта), открытые цели — иконкой цели и счётчиком «выполнено/всего», все выполнены —
 * зелёная с галочкой. Текст — первая цель, весь список — в подсказке. Клик открывает цели спринта (QG13).
 */
export function QuarterlyPlanGoalFlag({ flag, lane, topPx }: QuarterlyPlanGoalFlagProps) {
  const { t } = useI18n();
  const { detail, onSprintGoalsOpen, weeks } = useQuarterlyPlanBoard();
  const laneHeightPx = useQuarterLaneHeight();
  const done = flag.goals.filter((goal) => goal.done).length;
  const allDone = done === flag.goals.length;
  const phase = t(`quarterlyPlan.goals.type.${flag.goalType}`);
  const label = t('quarterlyPlan.goals.flag', { done, phase, sprint: flag.sprint.name, total: flag.goals.length });
  const title = [label, ...flag.goals.map((goal) => `${goal.done ? '✓' : '○'} ${goal.text}`)].join('\n');
  const box = quarterNoteBoxStyle({ rows: 1, startWeek: flag.startWeek, weeks: flag.weeks }, lane, topPx, weeks.length, laneHeightPx);
  const tone = allDone
    ? 'border-green-300 bg-green-100 text-green-900 hover:bg-green-200 active:bg-green-300 dark:border-green-700 dark:bg-green-900/50 dark:text-green-100 dark:hover:bg-green-900/70'
    : 'border-indigo-200 bg-indigo-50 text-indigo-950 hover:bg-indigo-100 active:bg-indigo-200 dark:border-indigo-700/70 dark:bg-indigo-950/60 dark:text-indigo-100 dark:hover:bg-indigo-900/60';
  const badge = allDone
    ? 'bg-green-200/70 text-green-800 dark:bg-green-800/60 dark:text-green-100'
    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-200';

  return (
    // Обёртка — место спринта в дорожке; сама пилюля по тексту и ловит клики только собой.
    <div
      className="pointer-events-none absolute flex items-center"
      data-quarter-goal-flag={flag.id}
      style={{ ...box, height: box.height - PILL_INSET_PX, top: box.top + PILL_INSET_PX / 2, zIndex: ZIndex.contentInteractive }}
    >
      <button
        aria-label={label}
        className={`pointer-events-auto inline-flex h-full max-w-full min-w-0 ${detail === 'days' ? 'w-full' : ''} cursor-pointer items-center gap-1.5 rounded-full border pl-1.5 pr-2 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] ${tone}`}
        title={title}
        type="button"
        onClick={() => onSprintGoalsOpen(flag.sprint, flag.boardId)}
      >
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${allDone ? 'text-green-700 dark:text-green-300' : 'text-indigo-600 dark:text-indigo-300'}`}
          name={allDone ? 'check-circle' : 'target'}
        />
        <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-semibold leading-4 ${badge}`}>{phase}</span>
        <span className="min-w-0 flex-1 truncate text-left">{flag.goals[0]?.text}</span>
        <span className="shrink-0 font-medium tabular-nums opacity-70">
          {done}/{flag.goals.length}
        </span>
      </button>
    </div>
  );
}
