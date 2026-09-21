'use client';


import type { KanbanLaneWithColumns } from './kanbanLane.types';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';

import {
  createKanbanLaneToggleKeyDownHandler,
  kanbanLaneHeaderAriaLabel,
  kanbanLaneHeaderTotalsLabel,
} from './kanbanLaneHeaderHelpers';
import { KanbanLaneHeaderTitle } from './KanbanLaneHeaderTitle';

interface KanbanLaneHeaderProps {
  collapsedLanes: Set<string>;
  columnsMinWidth: number | undefined;
  filteredCount: number;
  groupByParent: boolean;
  lane: KanbanLaneWithColumns;
  laneKey: string;
  resolvedLaneName: string;
  showAvatar: boolean;
  totalSp: number;
  totalTp: number;
  t: (key: string) => string;
  toggleLaneCollapsed: (laneKey: string) => void;
}

export function KanbanLaneHeader({
  collapsedLanes,
  columnsMinWidth,
  filteredCount,
  groupByParent,
  lane,
  laneKey,
  resolvedLaneName,
  showAvatar,
  totalSp,
  totalTp,
  t,
  toggleLaneCollapsed,
}: KanbanLaneHeaderProps) {
  const isLaneCollapsed = collapsedLanes.has(laneKey);
  const developer = showAvatar ? lane.developer : undefined;

  return (
    <div
      aria-expanded={!isLaneCollapsed}
      aria-label={kanbanLaneHeaderAriaLabel(isLaneCollapsed, t)}
      className="sticky top-14 z-[5] flex items-center gap-2 py-4 px-1 bg-gray-50 dark:bg-gray-900 min-w-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
      role="button"
      style={columnsMinWidth !== undefined ? { minWidth: columnsMinWidth } : undefined}
      tabIndex={0}
      onClick={() => toggleLaneCollapsed(laneKey)}
      onKeyDown={createKanbanLaneToggleKeyDownHandler(laneKey, toggleLaneCollapsed)}
    >
      <Icon
        className="w-4 h-4 shrink-0 text-gray-600 dark:text-gray-400"
        name={isLaneCollapsed ? 'chevron-right' : 'chevron-down'}
      />
      {developer ? (
        <Avatar
          avatarUrl={developer.avatarUrl}
          className="h-6 w-6 shrink-0 rounded-full"
          initials={resolvedLaneName.slice(0, 2).toUpperCase() || '?'}
        />
      ) : null}
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate min-w-0 flex items-center gap-1">
        <KanbanLaneHeaderTitle
          groupByParent={groupByParent}
          lane={lane}
          resolvedLaneName={resolvedLaneName}
        />
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
        {kanbanLaneHeaderTotalsLabel(filteredCount, totalSp, totalTp)}
      </span>
    </div>
  );
}
