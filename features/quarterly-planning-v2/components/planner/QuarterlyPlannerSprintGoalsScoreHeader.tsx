'use client';

import type { QuarterlySprintScoreEntry } from '../../utils/quarterlySprintScore';

import {
  SprintScoreMarkInline,
} from '@/features/sprint/components/sprintScoreUi';

export function QuarterlyPlannerSprintGoalsScoreHeader({
  scoreEntry,
  sprintFullName,
}: {
  scoreEntry: QuarterlySprintScoreEntry;
  sprintFullName: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-base font-semibold leading-snug text-gray-900 dark:text-gray-100">
        {sprintFullName}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1">
        {scoreEntry.markEmoji ? (
          <span aria-hidden className="text-lg leading-none">
            {scoreEntry.markEmoji}
          </span>
        ) : null}
        <SprintScoreMarkInline mark={scoreEntry.mark} size="lg" />
      </span>
    </div>
  );
}
