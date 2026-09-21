'use client';

import type { KanbanLaneWithColumns } from './kanbanLane.types';
import type { Developer, Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { KanbanLaneColumns } from './KanbanLaneColumns';
import { KanbanLaneHeader } from './KanbanLaneHeader';
import {
  kanbanLaneTotals,
  kanbanTaskMatchesNameFilter,
  resolveKanbanLaneDisplayName,
} from './kanbanViewHelpers';

interface KanbanLaneSectionProps {
  activeTaskId: string | null;
  collapsedLanes: Set<string>;
  columnsMinWidth: number | undefined;
  contextMenuBlurOtherCards: boolean;
  contextMenuTaskId: string | null | undefined;
  developers: Developer[];
  globalNameFilter: string | undefined;
  groupByAssignee: boolean;
  groupByParent: boolean;
  lane: KanbanLaneWithColumns;
  sourceColumnId: string | null | undefined;
  canDropInColumn: (column: BoardColumn) => boolean;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onTaskClick?: (taskId: string) => void;
  t: (key: string, values?: Record<string, number | string>) => string;
  toggleLaneCollapsed: (laneKey: string) => void;
}

export function KanbanLaneSection(props: KanbanLaneSectionProps) {
  const laneKey = props.lane.assigneeKey ?? props.lane.laneKey ?? '';
  const resolvedLaneName = resolveKanbanLaneDisplayName(
    {
      assigneeKey: props.lane.assigneeKey,
      assigneeName: props.lane.assigneeName,
      laneKey: props.lane.laneKey,
      laneName: props.lane.assigneeName ?? props.lane.laneName,
    },
    props.groupByAssignee,
    props.groupByParent,
    props.t
  );
  const showAvatar =
    props.groupByAssignee &&
    props.lane.assigneeKey !== '__unassigned__' &&
    Boolean(props.lane.developer);
  const { totalSp, totalTp } = kanbanLaneTotals(props.lane.tasks);
  const filteredCount = props.globalNameFilter
    ? props.lane.tasks.filter((task) =>
        kanbanTaskMatchesNameFilter(task, props.globalNameFilter!)
      ).length
    : props.lane.tasks.length;

  return (
    <div key={laneKey} className="flex flex-col gap-0 flex-none">
      <KanbanLaneHeader
        collapsedLanes={props.collapsedLanes}
        columnsMinWidth={props.columnsMinWidth}
        filteredCount={filteredCount}
        groupByParent={props.groupByParent}
        lane={props.lane}
        laneKey={laneKey}
        resolvedLaneName={resolvedLaneName}
        showAvatar={showAvatar}
        t={props.t}
        toggleLaneCollapsed={props.toggleLaneCollapsed}
        totalSp={totalSp}
        totalTp={totalTp}
      />
      <KanbanLaneColumns
        activeTaskId={props.activeTaskId}
        canDropInColumn={props.canDropInColumn}
        contextMenuBlurOtherCards={props.contextMenuBlurOtherCards}
        contextMenuTaskId={props.contextMenuTaskId}
        developers={props.developers}
        globalNameFilter={props.globalNameFilter}
        isLaneCollapsed={props.collapsedLanes.has(laneKey)}
        lane={props.lane}
        laneKey={laneKey}
        sourceColumnId={props.sourceColumnId}
        onContextMenu={props.onContextMenu}
        onTaskClick={props.onTaskClick}
      />
    </div>
  );
}
