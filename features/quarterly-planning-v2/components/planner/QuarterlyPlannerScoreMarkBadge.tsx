'use client';

import type { QuarterlySprintScoreEntry } from '../../utils/quarterlySprintScore';

import {
  SprintScoreMarkInline,
} from '@/features/sprint/components/sprintScoreUi';

export function QuarterlyPlannerScoreMarkBadge({
  scoreEntry,
}: {
  scoreEntry: QuarterlySprintScoreEntry;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {scoreEntry.markEmoji ? (
        <span aria-hidden className="text-sm leading-none">
          {scoreEntry.markEmoji}
        </span>
      ) : null}
      <SprintScoreMarkInline mark={scoreEntry.mark} />
    </span>
  );
}
