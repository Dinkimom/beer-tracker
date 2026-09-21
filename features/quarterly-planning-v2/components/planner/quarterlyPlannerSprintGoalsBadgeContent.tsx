'use client';

import type { SprintGoalsSummary } from '../../utils/quarterlySprintGoals';
import type { QuarterlySprintScoreEntry } from '../../utils/quarterlySprintScore';

import { SprintScoreSpTpMetricsPanel } from '@/features/sprint/components/sprintScoreUi';

import { QuarterlyPlannerSprintGoalsChecklist } from './QuarterlyPlannerSprintGoalsChecklist';
import { QuarterlyPlannerSprintGoalsScoreHeader } from './QuarterlyPlannerSprintGoalsScoreHeader';

interface QuarterlyPlannerSprintGoalsPopoverContentProps {
  goals: SprintGoalsSummary;
  goalsMetricLabel: string;
  hasGoals: boolean;
  hasScore: boolean;
  hideTp: boolean;
  scoreEntry?: QuarterlySprintScoreEntry;
  sprintFullName: string;
}

export function QuarterlyPlannerSprintGoalsPopoverContent({
  sprintFullName,
  scoreEntry,
  hasScore,
  hasGoals,
  goals,
  goalsMetricLabel,
  hideTp,
}: QuarterlyPlannerSprintGoalsPopoverContentProps) {
  const scoreRow = scoreEntry?.rows[0];

  return (
    <div className="max-w-sm min-w-[240px]">
      {hasScore && scoreEntry ? (
        <QuarterlyPlannerSprintGoalsScoreHeader
          scoreEntry={scoreEntry}
          sprintFullName={sprintFullName}
        />
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold leading-snug text-gray-900 dark:text-gray-100">
            {sprintFullName}
          </span>
        </div>
      )}

      {hasGoals ? (
        <QuarterlyPlannerSprintGoalsChecklist
          goals={goals}
          goalsMetricLabel={goalsMetricLabel}
          hasScore={hasScore}
        />
      ) : null}

      {hasScore && scoreRow ? (
        <SprintScoreSpTpMetricsPanel hideTp={hideTp} row={scoreRow} />
      ) : null}
    </div>
  );
}
