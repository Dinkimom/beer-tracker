'use client';

import type { SprintGoalsSummary } from '../../utils/quarterlySprintGoals';

const GOALS_EMOJI = '🎯';

export function QuarterlyPlannerGoalsCounter({ goals }: { goals: SprintGoalsSummary }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 tabular-nums text-gray-600 dark:text-gray-400">
      <span aria-hidden className="text-sm leading-none">
        {GOALS_EMOJI}
      </span>
      <span>
        {goals.checklistDone}/{goals.checklistTotal}
      </span>
    </span>
  );
}
