'use client';

import type { TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';

type PhaseBarTaskLinkPosition = Pick<TaskPosition, 'duration' | 'sourceTaskId' | 'sourceTaskSummary'>;

export function PhaseBarTaskLink({ position }: { position: PhaseBarTaskLinkPosition }) {
  const issueUrl = useIssueTrackerIssueWebUrl(position.sourceTaskId ?? '');
  const widthDays = position.duration / PARTS_PER_DAY;
  const isOneDayOrLess = widthDays <= 1;
  const showKeyAndSummary =
    !isOneDayOrLess && widthDays > 3 && position.sourceTaskSummary;
  const label = showKeyAndSummary
    ? `${position.sourceTaskId} - ${position.sourceTaskSummary}`
    : position.sourceTaskId;
  const fontClass = isOneDayOrLess ? 'text-[8px]' : 'text-[10px]';
  return (
    <a
      className={`${fontClass} font-medium text-gray-800 dark:text-gray-200 hover:underline min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-0.5 block`}
      href={issueUrl}
      rel="noopener noreferrer"
      target="_blank"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  );
}
