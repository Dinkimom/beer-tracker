'use client';

import type { KanbanColumnHeaderData, KanbanLaneWithColumns } from './kanbanLane.types';

import { KanbanLaneColumns } from './KanbanLaneColumns';
import { KanbanLaneSection } from './KanbanLaneSection';

interface KanbanColumnsLayoutProps {
  collapsedLanes: Set<string>;
  columnsContainerRef: React.RefObject<HTMLDivElement | null>;
  columnsMinWidth: number | undefined;
  columnsWithHeaderData: KanbanColumnHeaderData[];
  groupByAssignee: boolean;
  groupByParent: boolean;
  hasLaneGrouping: boolean;
  lanesWithColumns: KanbanLaneWithColumns[];
  toggleLaneCollapsed: (laneKey: string) => void;
}

export function KanbanColumnsLayout({
  collapsedLanes,
  columnsContainerRef,
  columnsMinWidth,
  columnsWithHeaderData,
  groupByAssignee,
  groupByParent,
  hasLaneGrouping,
  lanesWithColumns,
  toggleLaneCollapsed,
}: KanbanColumnsLayoutProps) {
  if (hasLaneGrouping && lanesWithColumns.length > 0) {
    return (
      <div ref={columnsContainerRef} className="flex min-h-full flex-none flex-col pb-4 pl-4 pr-4">
        {lanesWithColumns.map((lane) => (
          <KanbanLaneSection
            key={lane.assigneeKey ?? lane.laneKey ?? ''}
            collapsedLanes={collapsedLanes}
            columnsMinWidth={columnsMinWidth}
            groupByAssignee={groupByAssignee}
            groupByParent={groupByParent}
            lane={lane}
            toggleLaneCollapsed={toggleLaneCollapsed}
          />
        ))}
      </div>
    );
  }

  return (
    <KanbanLaneColumns
      className="flex min-h-full flex-none items-stretch gap-3 px-4 pb-4 pt-0"
      columnsWithHeaderData={columnsWithHeaderData}
      containerRef={columnsContainerRef}
      laneKey={null}
    />
  );
}
