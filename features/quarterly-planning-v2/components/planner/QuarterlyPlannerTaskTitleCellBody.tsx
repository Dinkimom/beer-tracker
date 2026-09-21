'use client';

import type { QuarterlyEpicPointsBundle } from '../../hooks/useQuarterlyEpicPoints';
import type { ReactNode } from 'react';

import { QuarterlyPlannerEpicPointsSummary } from './QuarterlyPlannerEpicPointsSummary';
import { QuarterlyPlannerRemoveFromPlanButton } from './QuarterlyPlannerRemoveFromPlanButton';
import { QuarterlyPlannerShowDevelopmentPlanButton } from './QuarterlyPlannerShowDevelopmentPlanButton';
import { QuarterlyTaskTitleLink } from './QuarterlyTaskTitleLink';

interface QuarterlyPlannerTaskTitleCellBodyProps {
  displayKey: string;
  dragHandle?: ReactNode;
  epicPoints?: QuarterlyEpicPointsBundle;
  taskName?: string;
  taskType?: string;
  onRemoveFromPlan?: () => void;
  onShowDevelopmentPlan?: () => void;
}

export function QuarterlyPlannerTaskTitleCellBody({
  displayKey,
  dragHandle,
  epicPoints,
  onShowDevelopmentPlan,
  onRemoveFromPlan,
  taskName,
  taskType,
}: QuarterlyPlannerTaskTitleCellBodyProps) {
  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col px-2 ${
        epicPoints ? 'justify-start py-1.5' : 'justify-center py-1'
      }`}
    >
      <div className="flex min-h-0 w-full items-center gap-1.5">
        {dragHandle}
        <QuarterlyTaskTitleLink
          className="min-w-0 flex-1"
          displayKey={displayKey}
          taskName={taskName}
          taskType={taskType}
        />
        {onShowDevelopmentPlan ? (
          <QuarterlyPlannerShowDevelopmentPlanButton onShow={onShowDevelopmentPlan} />
        ) : null}
        {onRemoveFromPlan ? (
          <QuarterlyPlannerRemoveFromPlanButton onRemove={onRemoveFromPlan} />
        ) : null}
      </div>
      {epicPoints ? (
        <QuarterlyPlannerEpicPointsSummary
          isLoading={epicPoints.isLoading}
          tiles={epicPoints.tiles}
        />
      ) : null}
    </div>
  );
}
