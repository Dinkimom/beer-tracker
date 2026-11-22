import type { TaskCardBodyLayerProps } from './TaskCardStandardBody';

import React from 'react';

import { formatPointsForDisplay } from '@/lib/pointsUtils';

import { resolveTaskCardEstimateVisibility } from '../taskCardEstimateVisibility';
import { useTaskCardEstimateMapping } from '../useTaskCardEstimateMapping';

import { TaskCardBody } from './TaskCardBody';
import { TaskCardTags } from './TaskCardTags';

/** Разделённое тело сайдбара: правки листа и длительность раскладки ему не нужны. */
type TaskCardSidebarResizedSplitProps = Omit<TaskCardBodyLayerProps, 'editing' | 'isResizing' | 'layoutDuration'>;

export function TaskCardSidebarResizedSplit({
  assigneeName,
  children,
  developers,
  isDragging,
  task,
  taskPosition,
  variant,
  visual,
}: TaskCardSidebarResizedSplitProps) {
  const { dividerBgClass, isDark, isQATask, paddingClasses, phaseCardColorScheme, qaRightBgColor, qaStripedStyle } =
    visual;
  const { estimatedTimeslots, extraSP, leftPercent, rightPercent, showExtraSplit } = visual.barMetrics;
  const showQaStripedLeftOverlay = Boolean(isQATask && visual.cardStyles.qaStripedStyle && qaStripedStyle);
  const estimateMapping = useTaskCardEstimateMapping();
  const showTpLabels = isQATask && task.hideTestPointsByIntegration !== true;
  const showPointsLabel = resolveTaskCardEstimateVisibility({
    hideTestPoints: task.hideTestPointsByIntegration === true,
    isQATask,
    mapping: estimateMapping,
    showEstimatesSetting: true,
    taskId: task.id,
  }).showPrimaryEstimate;
  return (
    <>
      <div
        className="absolute left-0 top-0 bottom-0 rounded-l-lg overflow-hidden flex flex-col"
        style={{ width: `${leftPercent}%` }}
      >
        {showQaStripedLeftOverlay && qaStripedStyle && (
          <div
            className="absolute inset-0 rounded-l-lg pointer-events-none"
            style={qaStripedStyle}
          />
        )}

        <div className={`relative w-full h-full flex flex-col ${paddingClasses}`}>

          <div className="flex flex-col min-h-0">
            <TaskCardBody
              assigneeName={assigneeName}
              developers={developers}
              displayDuration={estimatedTimeslots}
              isDragging={isDragging}
              isQATask={isQATask}
              phaseCardColorScheme={phaseCardColorScheme}
              task={task}
              variant={variant}
            />
          </div>

          <TaskCardTags
            displayDuration={estimatedTimeslots}
            task={task}
            taskPosition={taskPosition}
            variant={variant}
          />
        </div>
      </div>

      <div
        className={`absolute top-0 bottom-0 w-0.5 pointer-events-none ${dividerBgClass}`}
        style={{ left: `${leftPercent}%`, zIndex: 10 }}
      />

      <div
        className="absolute right-0 top-0 bottom-0 rounded-r-lg overflow-hidden flex items-center justify-center"
        style={{ width: `${rightPercent}%` }}
      >
        {qaRightBgColor && (
          <div
            className="absolute inset-0 rounded-r-lg pointer-events-none"
            style={{ backgroundColor: qaRightBgColor }}
          />
        )}

        <div
          aria-hidden
          className="absolute inset-0 rounded-r-lg pointer-events-none bg-white/40 dark:bg-black/25"
        />

        {showPointsLabel && showExtraSplit && extraSP > 0 && (
          <span
            className={`relative text-xs font-semibold whitespace-nowrap ${
              isDark ? 'text-white/95' : 'text-gray-800'
            }`}
          >
            +{formatPointsForDisplay(extraSP)} {showTpLabels ? 'tp' : 'sp'}
          </span>
        )}
      </div>

      {children}
    </>
  );
}
