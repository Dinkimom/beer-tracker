'use client';

import type { PositionPreview, PositionPreviewChangeOptions } from '../components/task-row/plan/occupancyPhaseBar.types';
import type { Developer, Task, TaskPosition } from '@/types';

import { useCallback, useEffect, useRef, useState } from 'react';

import { formatOccupancyErrorTooltip } from '@/features/sprint/utils/occupancyValidation';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';

import {
  PHASE_BAR_HEIGHT_COMPACT_PX,
  PHASE_BAR_HEIGHT_PX,
  PHASE_BAR_TOP_OFFSET_COMPACT_PX,
  PHASE_BAR_TOP_OFFSET_PX,
} from '../components/task-row/plan/occupancyPhaseBarConstants';

import {
  computeLinkAlreadyExistsFromSource,
  computeLinkedQaPreviewStart,
  computeValidTargetByTime,
  filterAssigneeOtherPositions,
  fromOccupancyTaskRowWeekPosition,
  syncQaPositionAfterDevSave,
  toOccupancyTaskRowWeekPosition,
} from './useOccupancyTaskRowStateHelpers';

interface UseOccupancyTaskRowStateParams {
  assignee?: Developer;
  assigneeIdToTaskPositions?: Map<string, Array<{ taskId: string; position: TaskPosition }>>;
  cellsPerDay?: 1 | 3;
  displayAsWeeks?: boolean;
  displayColumnCount?: number;
  legacyCompactLayout?: boolean;
  linkingFromTaskId?: string | null;
  occupancyErrorReasons: Map<string, string[]>;
  planRowHeight: number;
  position?: TaskPosition;
  qaAssignee?: Developer;
  qaPosition?: TaskPosition;
  qaTask?: Task;
  sourceRowEndCell?: number | null;
  sourceRowPhaseIds?: Set<string> | null;
  task: Task;
  taskLinks?: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  totalParts: number;
  workingDays?: number;
  handleEmptyCellClick: (
    targetTask: Task,
    dayIndex: number,
    partIndex: number,
    cellElement: HTMLElement,
    getAnchorRect?: (cell: HTMLElement) => DOMRect
  ) => void;
  handlePositionPreview: (
    taskId: string,
    preview: PositionPreview | null,
    options?: PositionPreviewChangeOptions
  ) => void;
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void> | void;
}

interface UseOccupancyTaskRowStateResult {
  assigneeOtherPositions: TaskPosition[];
  effectiveColSpan: number;
  effectivelyQa: boolean;
  hoveredCell: { taskId: string; dayIndex: number; partIndex: number } | null;
  linkAlreadyExistsFromSource: boolean;
  linkedQaPreviewStart: number | null;
  mainTask: Task;
  phaseBarHeightPx: number;
  phaseBarTopOffsetPx: number;
  planPhasesRef: React.RefObject<HTMLDivElement | null>;
  qaAssigneeOtherPositions: TaskPosition[];
  validTargetByTime: boolean;
  fromWeekPosition: (pos: TaskPosition) => TaskPosition;
  getErrorTooltip: (taskId: string) => string;
  handleDevPositionSave: (p: TaskPosition) => Promise<void>;
  handleDevPreviewChange: (preview: PositionPreview | null) => void;
  setHoveredCellBatched: (cell: { taskId: string; dayIndex: number; partIndex: number } | null) => void;
  toWeekPosition: (pos: TaskPosition) => TaskPosition;
  wrappedHandleEmptyCellClick: (
    targetTask: Task,
    dayIndex: number,
    partIndex: number,
    cellElement: HTMLElement
  ) => void;
}

export function useOccupancyTaskRowState(
  params: UseOccupancyTaskRowStateParams
): UseOccupancyTaskRowStateResult {
  const {
    task,
    qaTask,
    position,
    qaPosition,
    assignee,
    qaAssignee,
    assigneeIdToTaskPositions,
    totalParts: totalPartsParam,
    displayAsWeeks = false,
    displayColumnCount,
    workingDays = 10,
    planRowHeight,
    occupancyErrorReasons,
    legacyCompactLayout = false,
    cellsPerDay = 3,
    linkingFromTaskId = null,
    sourceRowPhaseIds = null,
    sourceRowEndCell = null,
    taskLinks = [],
    handlePositionPreview,
    onPositionSave,
    handleEmptyCellClick,
  } = params;

  const [hoveredCell, setHoveredCell] = useState<{
    taskId: string;
    dayIndex: number;
    partIndex: number;
  } | null>(null);
  const pendingHoverRef = useRef<{
    taskId: string;
    dayIndex: number;
    partIndex: number;
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const planPhasesRef = useRef<HTMLDivElement | null>(null);
  const [linkedQaPreviewStart, setLinkedQaPreviewStart] = useState<number | null>(null);

  const TOTAL_PARTS = totalPartsParam;
  const phaseBarHeightPx = legacyCompactLayout ? PHASE_BAR_HEIGHT_COMPACT_PX : PHASE_BAR_HEIGHT_PX;
  const phaseBarTopOffsetPx = legacyCompactLayout ? PHASE_BAR_TOP_OFFSET_COMPACT_PX : PHASE_BAR_TOP_OFFSET_PX;

  const setHoveredCellBatched = useCallback((cell: { taskId: string; dayIndex: number; partIndex: number } | null) => {
    if (cell === null) {
      pendingHoverRef.current = null;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setHoveredCell(null);
      return;
    }
    pendingHoverRef.current = cell;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        setHoveredCell(pendingHoverRef.current);
      });
    }
  }, []);

  useEffect(() => () => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
  }, []);

  const effectiveColSpan =
    displayAsWeeks && displayColumnCount != null ? displayColumnCount : workingDays;

  const toWeekPosition = useCallback(
    (pos: TaskPosition) => toOccupancyTaskRowWeekPosition(pos, displayAsWeeks, cellsPerDay),
    [displayAsWeeks, cellsPerDay]
  );

  const fromWeekPosition = useCallback(
    (pos: TaskPosition) => fromOccupancyTaskRowWeekPosition(pos, displayAsWeeks, cellsPerDay),
    [displayAsWeeks, cellsPerDay]
  );

  const getErrorTooltip = useCallback(
    (taskId: string) => {
      return formatOccupancyErrorTooltip(
        occupancyErrorReasons.get(taskId) as Parameters<typeof formatOccupancyErrorTooltip>[0]
      );
    },
    [occupancyErrorReasons]
  );

  const handleDevPreviewChange = useCallback(
    (preview: PositionPreview | null, options?: PositionPreviewChangeOptions) => {
      handlePositionPreview(task.id, preview, options);
      if (!qaPosition || !preview) {
        setLinkedQaPreviewStart(null);
        return;
      }
      setLinkedQaPreviewStart(computeLinkedQaPreviewStart(qaPosition, preview, TOTAL_PARTS));
    },
    [qaPosition, handlePositionPreview, task.id, TOTAL_PARTS]
  );

  const handleDevPositionSave = useCallback(
    async (p: TaskPosition) => {
      await onPositionSave?.(p, false);
      setLinkedQaPreviewStart(null);
      await syncQaPositionAfterDevSave(p, qaPosition, qaTask, TOTAL_PARTS, onPositionSave);
    },
    [qaPosition, qaTask, onPositionSave, TOTAL_PARTS]
  );

  const wrappedHandleEmptyCellClick = useCallback(
    (targetTask: Task, dayIndex: number, partIndex: number, cellElement: HTMLElement) => {
      const getAnchorRect = (cell: HTMLElement) => {
        const r = cell.getBoundingClientRect();
        return new DOMRect(r.left, r.top, r.width, Math.min(r.height, planRowHeight));
      };
      handleEmptyCellClick(targetTask, dayIndex, partIndex, cellElement, getAnchorRect);
    },
    [handleEmptyCellClick, planRowHeight]
  );

  const linkAlreadyExistsFromSource = computeLinkAlreadyExistsFromSource(
    linkingFromTaskId,
    sourceRowPhaseIds,
    taskLinks,
    task.id,
    qaTask?.id
  );

  const validTargetByTime = computeValidTargetByTime(position, qaPosition, qaTask, sourceRowEndCell);

  const assigneeOtherPositions = filterAssigneeOtherPositions(
    assignee,
    assigneeIdToTaskPositions,
    [task.id, qaTask?.id].filter((id): id is string => Boolean(id))
  );

  const qaAssigneeOtherPositions = filterAssigneeOtherPositions(
    qaAssignee,
    assigneeIdToTaskPositions,
    [qaTask?.id, task.id].filter((id): id is string => Boolean(id))
  );

  const mainTask = task.originalTaskId ? (qaTask ?? task) : task;
  const effectivelyQa = isEffectivelyQaTask(task);

  return {
    hoveredCell,
    setHoveredCellBatched,
    planPhasesRef,
    linkedQaPreviewStart,
    phaseBarHeightPx,
    phaseBarTopOffsetPx,
    effectiveColSpan,
    toWeekPosition,
    fromWeekPosition,
    getErrorTooltip,
    handleDevPreviewChange,
    handleDevPositionSave,
    wrappedHandleEmptyCellClick,
    linkAlreadyExistsFromSource,
    validTargetByTime,
    assigneeOtherPositions,
    qaAssigneeOtherPositions,
    mainTask,
    effectivelyQa,
  };
}
