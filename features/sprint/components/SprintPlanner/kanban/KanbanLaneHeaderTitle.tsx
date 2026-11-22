'use client';

import type { KanbanLaneWithColumns } from './kanbanLane.types';

import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';

export function KanbanLaneHeaderTitle({
  groupByParent,
  lane,
  resolvedLaneName,
}: {
  groupByParent: boolean;
  lane: KanbanLaneWithColumns;
  resolvedLaneName: string;
}) {
  const parentUrl = useIssueTrackerIssueWebUrl(lane.parentKey ?? '');
  if (groupByParent && lane.parentKey) {
    return (
      <>
        {/* Без веб-интерфейса трекера (встроенный) ключ — текст, не ссылка. */}
        {!parentUrl ? <span className="shrink-0 font-medium">{lane.parentKey}</span> : null}
        {parentUrl ? <a
          className="text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          href={parentUrl}
          rel="noopener noreferrer"
          target="_blank"
          onClick={(e) => e.stopPropagation()}
        >
          {lane.parentKey}
        </a> : null}
        <span className="shrink min-w-0 truncate"> - {lane.parentDisplay ?? resolvedLaneName}</span>
      </>
    );
  }
  return resolvedLaneName;
}
