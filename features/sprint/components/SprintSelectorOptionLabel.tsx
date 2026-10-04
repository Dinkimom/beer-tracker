'use client';

import type { SprintListItem } from '@/types/tracker';

import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import { SprintStatusTag } from './SprintStatusTag';

interface SprintSelectorOptionLabelProps {
  dateClassName: string;
  sprint: SprintListItem;
  titleClassName: string;
  formatDate: (dateString: string) => string;
}

/** Одна строка спринта: имя + даты + статус (без переноса). */
export function SprintSelectorOptionLabel({
  dateClassName,
  formatDate,
  sprint,
  titleClassName,
}: SprintSelectorOptionLabelProps) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={`shrink-0 text-sm font-semibold ${titleClassName}`}>
        {formatSprintListItemDisplayName(sprint)}
      </span>
      {sprint.startDate && sprint.endDate ? (
        <span className={`shrink-0 text-sm ${dateClassName}`}>
          {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
        </span>
      ) : null}
      <SprintStatusTag archived={sprint.archived} status={sprint.status} />
    </span>
  );
}
