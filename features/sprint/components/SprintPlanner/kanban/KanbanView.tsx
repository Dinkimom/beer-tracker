'use client';

import type { Developer, SidebarGroupBy, Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PhaseCardColorSchemeOverride } from '@/components/PhaseCardColorSchemeOverride';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { filterTasksByAssignees, selectedAssigneeIdsInPeople } from '@/features/backlog/utils/backlogFilterPeople';
import { useBoardParams } from '@/features/board/hooks/useBoardParams';
import { TaskCardDueDateContext } from '@/features/task/components/TaskCard/components/TaskCardDueDateChip';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { TaskCardBoardProvider } from '@/features/task/components/TaskCard/TaskCardBoardContext';
import {
  getIssueTransitions,
  getIssueTransitionsBatch,
  type TransitionItem,
} from '@/lib/beerTrackerApi';

import { KanbanBoardContext, type KanbanBoard } from './KanbanBoardContext';
import { KANBAN_CARD_SURFACE, KANBAN_COLUMN_HEADER_GLASS } from './kanbanChromeClasses';
import { KanbanColumnHeader } from './KanbanColumnHeader';
import { KanbanColumnsLayout } from './KanbanColumnsLayout';
import { KanbanColumnStatusChoiceModal } from './KanbanColumnStatusChoiceModal';
import { parseKanbanTaskId } from './kanbanDndUtils';
import {
  appendKanbanUnmappedStatusColumns,
  groupKanbanTasksByColumns,
  orderKanbanGroupedColumns,
} from './kanbanGroupTasksHelpers';
import { KanbanViewGate } from './KanbanViewGate';
import { buildKanbanColumnsWithHeaderData } from './kanbanViewHelpers';
import {
  applyKanbanStatusTransition,
  buildKanbanAssigneeLanes,
  buildKanbanParentLanes,
  handleKanbanDragEndStatusChange,
  kanbanColumnAllowsDrop,
  type KanbanDragEndStatusResult,
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
  developers: Developer[];
  groupBy?: SidebarGroupBy;
  /** Пустой set — без фильтра по исполнителю. */
  selectedAssigneeIds?: ReadonlySet<string>;
  tasks: Task[];
  onStatusChange?: (taskId: string, transitionId: string, targetStatusKey?: string, targetStatusDisplay?: string, screenId?: string) => Promise<void>;
}


function buildKanbanLaneColumnsWithHeaderData(
  laneTasks: Task[],
  boardColumns: BoardColumn[],
  unknownStatusDisplay: string
) {
  const grouped = groupKanbanTasksByColumns(laneTasks, boardColumns, unknownStatusDisplay);
  const ordered = orderKanbanGroupedColumns(grouped, boardColumns);
  return buildKanbanColumnsWithHeaderData(ordered);
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
  selectedAssigneeIds,
  onStatusChange,
}: KanbanViewProps) {
  const { t } = useI18n();

  const { groupByAssignee, groupByParent, hasLaneGrouping } = resolveKanbanGroupFlags(groupBy);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [transitionsForActive, setTransitionsForActive] = useState<TransitionItem[]>([]);
  const [transitionsByTaskId, setTransitionsByTaskId] = useState<Map<string, TransitionItem[]>>(new Map());
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const [statusChoice, setStatusChoice] = useState<Extract<
    KanbanDragEndStatusResult,
    { type: 'choose' }
  > | null>(null);
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
    // Сохранённый выбор (localStorage) — только из людей с задачами здесь, как в самом фильтре:
    // иначе человек из другого спринта давал пустой канбан без выбранного аватара, и сбросить было нечем.
    const assignees = [...new Set(displayTasks.flatMap((task) => (task.assignee ? [task.assignee] : [])))];
    const effective = selectedAssigneeIdsInPeople(selectedAssigneeIds, assignees.map((id) => ({ id })));
    return filterTasksByAssignees(displayTasks, effective);
  }, [selectedAssigneeIds, tasks]);

  const kanbanColumns = useMemo(
    () => (board?.columns?.length ? appendKanbanUnmappedStatusColumns(board.columns, tasksForKanban) : []),
    [board?.columns, tasksForKanban]
  );

  const columnsWithTasks = useMemo(() => {
    if (kanbanColumns.length === 0) return [];
    const grouped = groupKanbanTasksByColumns(
      tasksForKanban,
      kanbanColumns,
      t('sprintPlanner.kanban.unknownStatus')
    );
    return orderKanbanGroupedColumns(grouped, kanbanColumns);
  }, [kanbanColumns, tasksForKanban, t]);

  const columnsWithHeaderData = useMemo(() => {
    return buildKanbanColumnsWithHeaderData(columnsWithTasks);
  }, [columnsWithTasks]);

  const assigneeLanes = useMemo(() => {
    if (!groupByAssignee || !board?.columns?.length) return [];
    return buildKanbanAssigneeLanes(tasksForKanban, developers);
  }, [groupByAssignee, board?.columns?.length, tasksForKanban, developers]);

  const parentLanes = useMemo(() => {
    if (!groupByParent || !board?.columns?.length) return [];
    return buildKanbanParentLanes(tasksForKanban);
  }, [groupByParent, board?.columns?.length, tasksForKanban]);

  const assigneeLanesWithColumns = useMemo(() => {
    if (kanbanColumns.length === 0 || assigneeLanes.length === 0) return [];
    return assigneeLanes.map((lane) => ({
      ...lane,
      columnsWithHeaderData: buildKanbanLaneColumnsWithHeaderData(
        lane.tasks,
        kanbanColumns,
        t('sprintPlanner.kanban.unknownStatus')
      ),
    }));
  }, [assigneeLanes, kanbanColumns, t]);

  const parentLanesWithColumns = useMemo(() => {
    if (kanbanColumns.length === 0 || parentLanes.length === 0) return [];
    return parentLanes.map((lane) => ({
      ...lane,
      columnsWithHeaderData: buildKanbanLaneColumnsWithHeaderData(
        lane.tasks,
        kanbanColumns,
        t('sprintPlanner.kanban.unknownStatus')
      ),
    }));
  }, [parentLanes, kanbanColumns, t]);

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
    setStatusChoice(null);
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

  const forgetTaskTransitions = useCallback((taskId: string) => {
    setTransitionsByTaskId((prev) => {
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const result = handleKanbanDragEndStatusChange(
      event,
      tasksForKanban,
      columnsWithTasks,
      transitionsForActive,
      onStatusChange
    );
    if (result?.type === 'applied') forgetTaskTransitions(result.taskId);
    setStatusChoice(result?.type === 'choose' ? result : null);
    setActiveTaskId(null);
    setTransitionsForActive([]);
  }, [columnsWithTasks, forgetTaskTransitions, onStatusChange, tasksForKanban, transitionsForActive]);

  const handleStatusChoice = useCallback((transition: TransitionItem) => {
    if (!statusChoice || !onStatusChange) return;
    applyKanbanStatusTransition(
      statusChoice.taskId,
      statusChoice.column,
      transition,
      onStatusChange
    );
    forgetTaskTransitions(statusChoice.taskId);
    setStatusChoice(null);
  }, [forgetTaskTransitions, onStatusChange, statusChoice]);

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
  const kanbanBoard = useMemo<KanbanBoard>(
    () => ({ activeTaskId, canDropInColumn, sourceColumnId }),
    [activeTaskId, canDropInColumn, sourceColumnId]
  );
  const statusChoiceTask = statusChoice
    ? tasksForKanban.find((task) => task.id === statusChoice.taskId)
    : null;
  const displayColumns = resolveKanbanDisplayColumns(hasLaneGrouping, lanesWithColumns, columnsWithHeaderData);
  const headerColumns = resolveKanbanHeaderColumns(hasLaneGrouping, columnsWithHeaderData, lanesWithColumns, displayColumns);

  return (
    <TaskCardDueDateContext.Provider value={true}>
    <TaskCardBoardProvider board="kanban">
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
        {/* Sticky вне колонок: backdrop-filter на .kanban-column-glass ломает sticky внутри. */}
        <div
          className="sticky flex shrink-0 gap-3 bg-white pl-4 pr-4 pt-0 dark:bg-ds-surface-header"
          style={{
            top: 'var(--planner-controls-h, 0px)',
            zIndex: ZIndex.stickyMainHeader,
          }}
        >
          {headerColumns.map(({ column, tasks: columnTasks, totalSp, totalTp }) => (
            <div
              key={column.id}
              className={`w-[200px] max-w-[200px] min-w-[200px] shrink-0 overflow-hidden ${KANBAN_COLUMN_HEADER_GLASS}`}
              data-kanban-header={column.id}
            >
              <KanbanColumnHeader
                displayName={column.display}
                taskCount={columnTasks.length}
                totalSp={totalSp}
                totalTp={totalTp}
              />
            </div>
          ))}
        </div>
        <KanbanBoardContext.Provider value={kanbanBoard}>
          <KanbanColumnsLayout
            collapsedLanes={collapsedLanes}
            columnsContainerRef={columnsContainerRef}
            columnsMinWidth={columnsMinWidth}
            columnsWithHeaderData={columnsWithHeaderData}
            groupByAssignee={groupByAssignee}
            groupByParent={groupByParent}
            hasLaneGrouping={hasLaneGrouping}
            lanesWithColumns={lanesWithColumns}
            toggleLaneCollapsed={toggleLaneCollapsed}
          />
        </KanbanBoardContext.Provider>
        </div>
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-[184px] cursor-grabbing overflow-hidden rounded-lg opacity-95 shadow-xl rotate-2">
              <PhaseCardColorSchemeOverride value="monochrome">
                <TaskCard
                  assigneeName={activeTask.assigneeName}
                  className={KANBAN_CARD_SURFACE}
                  developers={developers}
                  task={activeTask}
                  variant="sidebar"
                />
              </PhaseCardColorSchemeOverride>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {statusChoice && statusChoiceTask ? (
        <KanbanColumnStatusChoiceModal
          columnName={statusChoice.column.display}
          task={statusChoiceTask}
          transitions={statusChoice.transitions}
          onClose={() => setStatusChoice(null)}
          onSelect={handleStatusChoice}
        />
      ) : null}
      </div>
    </KanbanViewGate>
    </TaskCardBoardProvider>
    </TaskCardDueDateContext.Provider>
  );
});
