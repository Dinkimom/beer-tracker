'use client';

import type { KanbanLaneWithColumns } from './kanbanLane.types';

import { useI18n } from '@/contexts/LanguageContext';

import { KanbanLaneColumns } from './KanbanLaneColumns';
import { KanbanLaneHeader } from './KanbanLaneHeader';
import { kanbanLaneTotals, resolveKanbanLaneDisplayName } from './kanbanViewHelpers';

interface KanbanLaneSectionProps {
  collapsedLanes: Set<string>;
  columnsMinWidth: number | undefined;
  groupByAssignee: boolean;
  groupByParent: boolean;
  lane: KanbanLaneWithColumns;
  toggleLaneCollapsed: (laneKey: string) => void;
}

export function KanbanLaneSection(props: KanbanLaneSectionProps) {
  const { t } = useI18n();
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
    t
  );
  const showAvatar =
    props.groupByAssignee &&
    props.lane.assigneeKey !== '__unassigned__' &&
    Boolean(props.lane.developer);
  const { totalSp, totalTp } = kanbanLaneTotals(props.lane.tasks);

  return (
    <div key={laneKey} className="flex flex-col gap-0 flex-none">
      <KanbanLaneHeader
        collapsedLanes={props.collapsedLanes}
        columnsMinWidth={props.columnsMinWidth}
        filteredCount={props.lane.tasks.length}
        groupByParent={props.groupByParent}
        lane={props.lane}
        laneKey={laneKey}
        resolvedLaneName={resolvedLaneName}
        showAvatar={showAvatar}
        t={t}
        toggleLaneCollapsed={props.toggleLaneCollapsed}
        totalSp={totalSp}
        totalTp={totalTp}
      />
      <KanbanLaneColumns
        columnsWithHeaderData={props.lane.columnsWithHeaderData}
        isLaneCollapsed={props.collapsedLanes.has(laneKey)}
        laneKey={laneKey}
      />
    </div>
  );
}
