'use client';

import type { QuarterlyEpicPointsBundle } from '../../hooks/useQuarterlyEpicPoints';
import type { Task } from '@/types';
import type { ReactNode } from 'react';

import { QuarterlyPlannerDragHandle } from './QuarterlyPlannerDragHandle';
import { QuarterlyPlannerTaskStatusCell } from './QuarterlyPlannerTaskStatusCell';
import { QuarterlyPlannerTaskTitleCell } from './QuarterlyPlannerTaskTitleCell';

export function renderQuarterlyPlannerTaskCells(params: {
  displayKey: string;
  dragHandle?: { attributes: object; listeners: object | undefined } | null;
  epicPoints?: QuarterlyEpicPointsBundle;
  onRemoveFromPlan?: () => void;
  onShowDevelopmentPlan?: () => void;
  onStatusChange?: (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => void;
  rowHeightPx: number;
  rowOpacity?: number;
  rowSpan?: number;
  sizeToContent?: boolean;
  status?: string;
  statusColorKey?: string;
  statusColumnWidth: number;
  task?: Pick<Task, 'id' | 'name' | 'originalStatus' | 'originalTaskId' | 'statusColorKey' | 'type'>;
  taskColumnWidth: number;
  taskName?: string;
  taskType?: string;
}): ReactNode {
  const {
    displayKey,
    dragHandle,
    epicPoints,
    onRemoveFromPlan,
    onShowDevelopmentPlan,
    onStatusChange,
    rowHeightPx,
    rowOpacity,
    rowSpan,
    sizeToContent,
    status,
    statusColorKey,
    statusColumnWidth,
    task,
    taskColumnWidth,
    taskName,
    taskType,
  } = params;
  const handleNode =
    dragHandle != null ? <QuarterlyPlannerDragHandle dragHandle={dragHandle} /> : null;
  return (
    <>
      <QuarterlyPlannerTaskTitleCell
        displayKey={displayKey}
        dragHandle={handleNode}
        epicPoints={epicPoints}
        rowHeightPx={rowHeightPx}
        rowOpacity={rowOpacity}
        rowSpan={rowSpan}
        sizeToContent={sizeToContent}
        taskColumnWidth={taskColumnWidth}
        taskName={taskName}
        taskType={taskType}
        onRemoveFromPlan={onRemoveFromPlan}
        onShowDevelopmentPlan={onShowDevelopmentPlan}
      />
      <QuarterlyPlannerTaskStatusCell
        rowHeightPx={rowHeightPx}
        rowOpacity={rowOpacity}
        rowSpan={rowSpan}
        sizeToContent={sizeToContent}
        status={status}
        statusColorKey={statusColorKey}
        statusColumnWidth={statusColumnWidth}
        task={task}
        taskColumnWidth={taskColumnWidth}
        onStatusChange={onStatusChange}
      />
    </>
  );
}
