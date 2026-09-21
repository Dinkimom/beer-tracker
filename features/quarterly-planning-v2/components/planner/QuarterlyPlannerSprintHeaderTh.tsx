'use client';

import type { QuarterlySprintInfo } from '../../types';
import type { SprintGoalsSummary } from '../../utils/quarterlySprintGoals';
import type { QuarterlySprintScoreEntry } from '../../utils/quarterlySprintScore';

import { WORKING_DAYS_PER_WEEK } from '@/constants';
import { countWorkingDaysInSprint } from '@/features/quarterly-planning-v2/utils/quarterlyTimelineHeader';
import {
  formatSprintDisplayName,
  formatSprintHeaderShortLabelWithQuarter,
} from '@/utils/sprintDisplayName';

import { QuarterlyPlannerSprintGoalsBadge } from './QuarterlyPlannerSprintGoalsBadge';
import { QuarterlyPlannerUnregisteredSprintHeader } from './QuarterlyPlannerUnregisteredSprintHeader';

function quarterlySprintHeaderToneClass(args: {
  isCurrentSprint: boolean;
  isPastSprint: boolean;
  isUnregistered: boolean;
}): string {
  if (args.isUnregistered) {
    return 'bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400';
  }
  if (args.isCurrentSprint) {
    return 'bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-900/40 dark:to-blue-800/40 text-gray-800 dark:text-gray-200';
  }
  if (args.isPastSprint) {
    return 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500';
  }
  return 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

interface QuarterlyPlannerSprintHeaderThProps {
  currentSprintIndex: number;
  hideTp?: boolean;
  idx: number;
  quarterlyTimelineThClass: string;
  quarterlyTimelineThStyle: {
    boxSizing: 'border-box';
    height: number;
    maxHeight: number;
    minHeight: number;
  };
  sprint: QuarterlySprintInfo;
  sprintGoalsBySprintId?: Map<number, SprintGoalsSummary>;
  sprintInfos: QuarterlySprintInfo[];
  sprintScoreMap?: Map<number, QuarterlySprintScoreEntry>;
}

function resolveSprintHeaderMetrics(
  sprint: QuarterlySprintInfo
): { goalsSprintId: number | null; scoreSprintId: number | null } {
  if (sprint.isUnregistered) {
    return { goalsSprintId: null, scoreSprintId: null };
  }
  const sprintIdNum =
    typeof sprint.id === 'number' ? sprint.id : Number.parseInt(String(sprint.id), 10);
  if (!Number.isFinite(sprintIdNum) || sprintIdNum <= 0) {
    return { goalsSprintId: null, scoreSprintId: null };
  }
  return { goalsSprintId: sprintIdNum, scoreSprintId: sprintIdNum };
}

export function QuarterlyPlannerSprintHeaderTh({
  currentSprintIndex,
  hideTp,
  idx,
  quarterlyTimelineThClass,
  quarterlyTimelineThStyle,
  sprint,
  sprintGoalsBySprintId,
  sprintInfos,
  sprintScoreMap,
}: QuarterlyPlannerSprintHeaderThProps) {
  const isCurrentSprint = !sprint.isUnregistered && currentSprintIndex === idx;
  const isPastSprint =
    !sprint.isUnregistered && currentSprintIndex >= 0 && idx < currentSprintIndex;
  const weekCount = Math.ceil(countWorkingDaysInSprint(sprint) / WORKING_DAYS_PER_WEEK);
  const { goalsSprintId, scoreSprintId } = resolveSprintHeaderMetrics(sprint);
  const sprintFullName = formatSprintDisplayName(
    sprint.name.trim() || String(sprint.id),
    sprint.quarter
  );
  const sprintLabel = formatSprintHeaderShortLabelWithQuarter(sprint.name, sprint.quarter);
  const goals = goalsSprintId != null ? sprintGoalsBySprintId?.get(goalsSprintId) : undefined;
  const scoreEntry =
    scoreSprintId != null ? sprintScoreMap?.get(scoreSprintId) : undefined;

  return (
    <th
      className={`${quarterlyTimelineThClass} font-semibold ${quarterlySprintHeaderToneClass({
        isUnregistered: Boolean(sprint.isUnregistered),
        isCurrentSprint,
        isPastSprint,
      })}`}
      colSpan={weekCount}
      style={quarterlyTimelineThStyle}
    >
      {sprint.isUnregistered ? (
        <QuarterlyPlannerUnregisteredSprintHeader sprintIndex={idx} sprintInfos={sprintInfos} />
      ) : (
        <QuarterlyPlannerSprintGoalsBadge
          goals={goals}
          hideTp={hideTp}
          scoreEntry={scoreEntry}
          sprintFullName={sprintFullName}
          sprintId={sprint.id}
          sprintLabel={sprintLabel}
        />
      )}
    </th>
  );
}
