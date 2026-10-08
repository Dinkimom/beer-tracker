'use client';

import type { Developer, SidebarGroupBy, Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PhaseCardColorSchemeOverride } from '@/components/PhaseCardColorSchemeOverride';
import { useI18n } from '@/contexts/LanguageContext';
import { filterTasksByAssignees } from '@/features/backlog/utils/backlogFilterPeople';
import { useBoardParams } from '@/features/board/hooks/useBoardParams';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import {
  getIssueTransitions,
  getIssueTransitionsBatch,
  type TransitionItem,
} from '@/lib/beerTrackerApi';
import { useRootStore } from '@/lib/layers';

import { KANBAN_CARD_SURFACE, KANBAN_COLUMN_GLASS } from './kanbanChromeClasses';
import { KanbanColumnHeader } from './KanbanColumnHeader';
import { KanbanColumnsLayout } from './KanbanColumnsLayout';
import { parseKanbanTaskId } from './kanbanDndUtils';
import {
  groupKanbanTasksByColumns,
  orderKanbanGroupedColumns,
} from './kanbanGroupTasksHelpers';
import { KanbanViewGate } from './KanbanViewGate';
import { buildKanbanColumnsWithHeaderData } from './kanbanViewHelpers';
import {
  buildKanbanAssigneeLanes,
  buildKanbanParentLanes,
  handleKanbanDragEndStatusChange,
  kanbanColumnAllowsDrop,
} from './kanbanViewLaneHelpers';
import {
  computeKanbanColumnsMinWidth,
  filterKanbanTasksForDisplay,
  resolveKanbanDisplayColumns,
  resolveKanbanGroupFlags,
  resolveKanbanHeaderColumns,
} from './KanbanViewShell';

export interface KanbanViewProps {
  boardId: number | null;
  contextMenuBlurOtherCards?: boolean;
  developers: Developer[];
  groupBy?: SidebarGroupBy;
  /** Пустой set — без фильтра по исполнителю. */
  selectedAssigneeIds?: ReadonlySet<string>;
  tasks: Task[];
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onStatusChange?: (taskId: string, transitionId: string, targetStatusKey?: string, targetStatusDisplay?: string, screenId?: string) => Promise<void>;
  onTaskClick?: (taskId: string) => void;
}


function buildKanbanLaneColumnsWithHeaderData(
  laneTasks: Task[],
  boardColumns: BoardColumn[],
  unknownStatusDisplay: string,
  globalNameFilter: string | undefined
) {
  const grouped = groupKanbanTasksByColumns(laneTasks, boardColumns, unknownStatusDisplay);
  const ordered = orderKanbanGroupedColumns(grouped, boardColumns);
  return buildKanbanColumnsWithHeaderData(ordered, globalNameFilter);
}

function resolveKanbanLanesWithColumns(
  hasLaneGrouping: boolean,
  groupByAssignee: boolean,
  assigneeLanesWithColumns: unknown[],
  parentLanesWithColumns: unknown[]
): unknown[] {
  if (!hasLaneGrouping) return [];
  return groupByAssignee ? assigneeLanesWithColumns : parentLanesWithColumns;
}

export const KanbanView = observer(function KanbanView({
  boardId,
  tasks,
  developers,
  groupBy = 'none',
  contextMenuBlurOtherCards = false,
  selectedAssigneeIds,
  onStatusChange,
  onTaskClick,
  onContextMenu,
}: KanbanViewProps) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const globalNameFilter = sprintPlannerUi.globalNameFilter;
  const contextMenuTaskId = sprintPlannerUi.contextMenuTaskId;

  const { groupByAssignee, groupByParent, hasLaneGrouping } = resolveKanbanGroupFlags(groupBy);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [transitionsForActive, setTransitionsForActive] = useState<TransitionItem[]>([]);
  const [transitionsByTaskId, setTransitionsByTaskId] = useState<Map<string, TransitionItem[]>>(new Map());
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const preloadStartedForRef = useRef<Set<string>>(new Set());

  const toggleLaneCollapsed = useCallback((laneKey: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(laneKey)) next.delete(laneKey);
      else next.add(laneKey);
      return next;
    });
  }, []);

  const { data: board, isLoading, error } = useBoardParams(boardId);

  const tasksForKanban = useMemo(() => {
    const displayTasks = filterKanbanTasksForDisplay(tasks);
    if (!selectedAssigneeIds || selectedAssigneeIds.size === 0) {
      return displayTasks;
    }
    return filterTasksByAssignees(displayTasks, selectedAssigneeIds);
  }, [selectedAssigneeIds, tasks]);

  const columnsWithTasks = useMemo(() => {
    if (!board?.columns?.length) return [];
    const grouped = groupKanbanTasksByColumns(
      tasksForKanban,
      board.columns,
      t('sprintPlanner.kanban.unknownStatus')
    );
    return orderKanbanGroupedColumns(grouped, board.columns);
  }, [board, tasksForKanban, t]);

  const columnsWithHeaderData = useMemo(() => {
    return buildKanbanColumnsWithHeaderData(columnsWithTasks, globalNameFilter);
  }, [columnsWithTasks, globalNameFilter]);

  const assigneeLanes = useMemo(() => {
    if (!groupByAssignee || !board?.columns?.length) return [];
    return buildKanbanAssigneeLanes(tasksForKanban, developers);
  }, [groupByAssignee, board?.columns?.length, tasksForKanban, developers]);

  const parentLanes = useMemo(() => {
    if (!groupByParent || !board?.columns?.length) return [];
    return buildKanbanParentLanes(tasksForKanban);
  }, [groupByParent, board?.columns?.length, tasksForKanban]);

  const assigneeLanesWithColumns = useMemo(() => {
    if (!board?.columns?.length || assigneeLanes.length === 0) return [];
    return assigneeLanes.map((lane) => ({
      ...lane,
      columnsWithHeaderData: buildKanbanLaneColumnsWithHeaderData(
        lane.tasks,
        board!.columns!,
        t('sprintPlanner.kanban.unknownStatus'),
        globalNameFilter
      ),
    }));
  }, [assigneeLanes, board, globalNameFilter, t]);

  const parentLanesWithColumns = useMemo(() => {
    if (!board?.columns?.length || parentLanes.length === 0) return [];
    return parentLanes.map((lane) => ({
      ...lane,
      columnsWithHeaderData: buildKanbanLaneColumnsWithHeaderData(
        lane.tasks,
        board!.columns!,
        t('sprintPlanner.kanban.unknownStatus'),
        globalNameFilter
      ),
    }));
  }, [parentLanes, board, globalNameFilter, t]);

  const lanesWithColumns = resolveKanbanLanesWithColumns(
    hasLaneGrouping,
    groupByAssignee,
    assigneeLanesWithColumns,
    parentLanesWithColumns
  ) as Array<
    (typeof assigneeLanesWithColumns)[number] | (typeof parentLanesWithColumns)[number]
  >;

  const sourceColumnId = useMemo(() => {
    if (!activeTaskId) return null;
    const entry = columnsWithTasks.find((e) => e.tasks.some((t) => t.id === activeTaskId));
    return entry?.column.id ?? null;
  }, [activeTaskId, columnsWithTasks]);

  useEffect(() => {
    if (!tasksForKanban.length) return;
    const toFetch = tasksForKanban
      .map((t) => t.id)
      .filter((id) => !preloadStartedForRef.current.has(id));
    if (toFetch.length === 0) return;
    toFetch.forEach((id) => preloadStartedForRef.current.add(id));

    getIssueTransitionsBatch(toFetch).then((result) => {
      setTransitionsByTaskId((prev) => {
        const next = new Map(prev);
        for (const [taskId, list] of Object.entries(result)) {
          next.set(taskId, list ?? []);
        }
        return next;
      });
    });
  }, [tasksForKanban]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = parseKanbanTaskId(String(event.active.id));
    if (!taskId) return;
    setActiveTaskId(taskId);
    const cached = transitionsByTaskId.get(taskId);
    if (cached !== undefined) {
      setTransitionsForActive(cached);
      return;
    }
    getIssueTransitions(taskId).then((list) => {
      setTransitionsForActive(Array.isArray(list) ? list : []);
      setTransitionsByTaskId((prev) => {
        const next = new Map(prev);
        next.set(taskId, Array.isArray(list) ? list : []);
        return next;
      });
    }).catch(() => setTransitionsForActive([]));
  }, [transitionsByTaskId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const deletedTaskId = handleKanbanDragEndStatusChange(
      event,
      tasksForKanban,
      columnsWithTasks,
      transitionsForActive,
      onStatusChange
    );
    if (deletedTaskId) {
      setTransitionsByTaskId((prev) => {
        const next = new Map(prev);
        next.delete(deletedTaskId);
        return next;
      });
    }
    setActiveTaskId(null);
    setTransitionsForActive([]);
  }, [columnsWithTasks, onStatusChange, tasksForKanban, transitionsForActive]);

  const canDropInColumn = useCallback(
    (column: BoardColumn) => kanbanColumnAllowsDrop(column, transitionsForActive),
    [transitionsForActive]
  );

  const columnsContainerRef = useRef<HTMLDivElement>(null);

  const columnsMinWidth = useMemo(
    () => computeKanbanColumnsMinWidth(columnsWithHeaderData.length),
    [columnsWithHeaderData.length]
  );

  const activeTask = activeTaskId ? tasksForKanban.find((t) => t.id === activeTaskId) : null;
  const displayColumns = resolveKanbanDisplayColumns(hasLaneGrouping, lanesWithColumns, columnsWithHeaderData);
  const headerColumns = resolveKanbanHeaderColumns(hasLaneGrouping, columnsWithHeaderData, lanesWithColumns, displayColumns);

  return (
    <KanbanViewGate
      boardId={boardId}
      error={error}
      hasBoard={Boolean(board)}
      isLoading={isLoading}
      t={t}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto overflow-y-auto bg-white scrollbar-thin-custom dark:bg-transparent"
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overscrollBehavior: 'auto',
          }}
        >
        {/* min-w-full + w-max: иначе scrollWidth по ширине колонок не растёт (flex-col + stretch). */}
        <div
          className="flex w-max min-w-full flex-col"
          style={{
            minWidth: columnsMinWidth,
            paddingTop: 'var(--planner-controls-h, 0px)',
          }}
        >
        {/* При группировке по lane шапки колонок общие и липкие; без группировки — внутри колонки. */}
        {hasLaneGrouping ? (
          <div
            className="sticky z-10 flex shrink-0 gap-3 bg-white/90 pl-4 pr-4 pt-0 backdrop-blur-md dark:bg-gray-950/70"
            style={{ top: 'var(--planner-controls-h, 0px)' }}
          >
            {headerColumns.map(({ column, filteredTasks, totalSp, totalTp }) => (
              <div
                key={column.id}
                className={`w-[280px] max-w-[280px] min-w-[280px] shrink-0 overflow-hidden ${KANBAN_COLUMN_GLASS}`}
                data-kanban-header={column.id}
              >
                <KanbanColumnHeader
                  displayName={column.display}
                  taskCount={filteredTasks.length}
                  totalSp={totalSp}
                  totalTp={totalTp}
                />
              </div>
            ))}
          </div>
        ) : null}
        <KanbanColumnsLayout
          activeTaskId={activeTaskId}
          canDropInColumn={canDropInColumn}
          collapsedLanes={collapsedLanes}
          columnsContainerRef={columnsContainerRef}
          columnsMinWidth={columnsMinWidth}
          columnsWithHeaderData={columnsWithHeaderData}
          contextMenuBlurOtherCards={contextMenuBlurOtherCards}
          contextMenuTaskId={contextMenuTaskId}
          developers={developers}
          globalNameFilter={globalNameFilter}
          groupByAssignee={groupByAssignee}
          groupByParent={groupByParent}
          hasLaneGrouping={hasLaneGrouping}
          lanesWithColumns={lanesWithColumns}
          sourceColumnId={sourceColumnId}
          t={t}
          toggleLaneCollapsed={toggleLaneCollapsed}
          onContextMenu={onContextMenu}
          onTaskClick={onTaskClick}
        />
        </div>
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-[264px] cursor-grabbing overflow-hidden rounded-lg opacity-95 shadow-xl rotate-2">
              <PhaseCardColorSchemeOverride value="monochrome">
                <TaskCard
                  assigneeName={activeTask.assigneeName}
                  className={KANBAN_CARD_SURFACE}
                  developers={developers}
                  hideStatusTag
                  task={activeTask}
                  variant="sidebar"
                />
              </PhaseCardColorSchemeOverride>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      </div>
    </KanbanViewGate>
  );
});
