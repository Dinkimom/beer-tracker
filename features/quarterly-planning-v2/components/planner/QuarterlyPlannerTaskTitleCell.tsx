'use client';

import type { QuarterlyEpicPointsBundle } from '../../hooks/useQuarterlyEpicPoints';
import type { CSSProperties, ReactNode } from 'react';

import { QuarterlyPlannerStickyColumnEdge } from './QuarterlyPlannerStickyColumnEdge';
import { QuarterlyPlannerTaskTitleCellBody } from './QuarterlyPlannerTaskTitleCellBody';

function quarterlyTaskTitleCellStyle(args: {
  rowHeightPx: number;
  rowOpacity: number;
  sizeToContent: boolean;
  taskColumnWidth: number;
}): CSSProperties {
  const { rowHeightPx, rowOpacity, sizeToContent, taskColumnWidth } = args;
  return {
    width: taskColumnWidth,
    minWidth: taskColumnWidth,
    height: sizeToContent ? 'auto' : rowHeightPx,
    minHeight: rowHeightPx,
    maxHeight: sizeToContent ? undefined : rowHeightPx,
    boxSizing: 'border-box',
    verticalAlign: sizeToContent ? 'top' : 'middle',
    opacity: rowOpacity,
    transition: 'opacity 0.2s ease',
  };
}

interface QuarterlyPlannerTaskTitleCellProps {
  displayKey: string;
  dragHandle?: ReactNode;
  epicPoints?: QuarterlyEpicPointsBundle;
  rowHeightPx: number;
  rowOpacity?: number;
  rowSpan?: number;
  /** Высота по содержимому строки, без жёсткого max-height. */
  sizeToContent?: boolean;
  taskColumnWidth: number;
  taskName?: string;
  taskType?: string;
  onRemoveFromPlan?: () => void;
  onShowDevelopmentPlan?: () => void;
}

export function QuarterlyPlannerTaskTitleCell({
  displayKey,
  dragHandle,
  epicPoints,
  onShowDevelopmentPlan,
  onRemoveFromPlan,
  rowHeightPx,
  rowOpacity = 1,
  rowSpan,
  sizeToContent = false,
  taskColumnWidth,
  taskName,
  taskType,
}: QuarterlyPlannerTaskTitleCellProps) {
  return (
    <td
      className="group/quarterly-task-title-cell sticky left-0 z-[6] border-b border-gray-100 dark:border-gray-700 p-0 relative bg-white dark:bg-gray-900 overflow-hidden"
      rowSpan={rowSpan}
      style={quarterlyTaskTitleCellStyle({
        rowHeightPx,
        rowOpacity,
        sizeToContent,
        taskColumnWidth,
      })}
    >
      <QuarterlyPlannerStickyColumnEdge />
      <QuarterlyPlannerTaskTitleCellBody
        displayKey={displayKey}
        dragHandle={dragHandle}
        epicPoints={epicPoints}
        taskName={taskName}
        taskType={taskType}
        onRemoveFromPlan={onRemoveFromPlan}
        onShowDevelopmentPlan={onShowDevelopmentPlan}
      />
    </td>
  );
}
