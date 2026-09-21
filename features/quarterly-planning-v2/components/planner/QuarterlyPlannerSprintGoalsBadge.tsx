'use client';

import type { SprintGoalsSummary } from '../../utils/quarterlySprintGoals';
import type { QuarterlySprintScoreEntry } from '../../utils/quarterlySprintScore';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

import { QuarterlyPlannerGoalsCounter } from './QuarterlyPlannerGoalsCounter';
import { QuarterlyPlannerScoreMarkBadge } from './QuarterlyPlannerScoreMarkBadge';
import { QuarterlyPlannerSprintGoalsPopoverContent } from './quarterlyPlannerSprintGoalsBadgeContent';

function quarterlySprintGoalsBadgeAriaLabel(args: {
  hasGoals: boolean;
  hasScore: boolean;
  goals: { checklistDone: number; checklistTotal: number } | undefined;
  scoreEntry: { mark: number } | undefined;
  sprintFullName: string;
  t: ReturnType<typeof useI18n>['t'];
}): string {
  if (args.hasScore && args.scoreEntry) {
    return args.t('planning.quarterlyV2.sprintMarkTriggerAria', {
      sprint: args.sprintFullName,
      mark: args.scoreEntry.mark,
    });
  }
  if (args.hasGoals && args.goals) {
    return args.t('planning.quarterlyV2.sprintGoalsTriggerAria', {
      sprint: args.sprintFullName,
      done: args.goals.checklistDone,
      total: args.goals.checklistTotal,
    });
  }
  return args.sprintFullName;
}

const EMPTY_GOALS: SprintGoalsSummary = {
  checklistDone: 0,
  checklistItems: [],
  checklistTotal: 0,
};

interface QuarterlyPlannerSprintGoalsBadgeProps {
  goals?: SprintGoalsSummary;
  hideTp?: boolean;
  scoreEntry?: QuarterlySprintScoreEntry;
  sprintFullName: string;
  sprintId: number | string;
  sprintLabel: string;
}

export function QuarterlyPlannerSprintGoalsBadge({
  goals = EMPTY_GOALS,
  hideTp = false,
  scoreEntry,
  sprintFullName,
  sprintId,
  sprintLabel,
}: QuarterlyPlannerSprintGoalsBadgeProps) {
  const { t } = useI18n();
  const hasGoals = goals.checklistTotal > 0;
  const hasScore = scoreEntry != null && scoreEntry.rows.length > 0;
  const hasPopover = hasGoals || hasScore;

  const headerContent = (
    <span className="inline-flex max-w-full items-center justify-center gap-1.5">
      <span className="truncate">{sprintLabel}</span>
      {hasGoals ? <QuarterlyPlannerGoalsCounter goals={goals} /> : null}
      {hasScore && scoreEntry ? <QuarterlyPlannerScoreMarkBadge scoreEntry={scoreEntry} /> : null}
    </span>
  );

  const ariaLabel = quarterlySprintGoalsBadgeAriaLabel({
    hasGoals,
    hasScore,
    goals,
    scoreEntry,
    sprintFullName,
    t,
  });

  if (!hasPopover) {
    return (
      <span aria-label={ariaLabel} className="block max-w-full truncate">
        {headerContent}
      </span>
    );
  }

  return (
    <TextTooltip
      content={
        <QuarterlyPlannerSprintGoalsPopoverContent
          goals={goals}
          goalsMetricLabel={t('sidebar.sprintScoreBlock.goalsMetricLabel')}
          hasGoals={hasGoals}
          hasScore={hasScore}
          hideTp={hideTp}
          scoreEntry={scoreEntry}
          sprintFullName={sprintFullName}
        />
      }
      contentClassName="!bg-white dark:!bg-gray-800 !p-4 !shadow-lg !border !border-gray-200 dark:!border-gray-700 !rounded-lg !text-left !max-w-sm pointer-events-auto"
      delayDuration={120}
      interactive
      side="bottom"
      singleInGroupId={`quarterly-sprint-header-${sprintId}`}
    >
      <button
        aria-label={ariaLabel}
        className="inline-flex max-w-full cursor-pointer items-center justify-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-semibold transition-colors hover:bg-gray-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:hover:bg-white/10"
        type="button"
      >
        {headerContent}
      </button>
    </TextTooltip>
  );
}
