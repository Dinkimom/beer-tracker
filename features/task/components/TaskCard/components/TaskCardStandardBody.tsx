import type { TaskCardEditing } from '../TaskCard';
import type { TaskCardVisual } from '../useTaskCardVisualState';
import type { Developer, Task, TaskCardVariant, TaskPosition } from '@/types';

import React from 'react';

import { resolveTaskCardEstimateVisibility } from '../taskCardEstimateVisibility';
import { useTaskCardEstimateMapping } from '../useTaskCardEstimateMapping';

import { TaskCardBody } from './TaskCardBody';
import { TaskCardExtraSplitOverlay } from './TaskCardExtraSplitOverlay';
import { TaskCardTags } from './TaskCardTags';

/** Тело карточки (обычное и разделённое для сайдбара): вид — одним объектом, правка листа — срезом. */
export interface TaskCardBodyLayerProps {
  assigneeName?: string;
  children?: React.ReactNode;
  developers: Developer[];
  editing: TaskCardEditing;
  isDragging: boolean;
  isResizing?: boolean;
  /** Длительность раскладки (с превью ресайза), в ячейках. */
  layoutDuration: number;
  task: Task;
  taskPosition?: TaskPosition;
  variant: TaskCardVariant;
  visual: TaskCardVisual;
}

export function TaskCardStandardBody({
  assigneeName,
  children,
  developers,
  editing,
  isDragging,
  isResizing = false,
  layoutDuration,
  task,
  taskPosition,
  variant,
  visual,
}: TaskCardBodyLayerProps) {
  const {
    dividerBgClass,
    isDark,
    isQATask,
    isSwimlane,
    isVeryNarrow,
    phaseCardColorScheme,
    qaRightBgColor,
    resolvedSwimlaneCardFields: swimlaneCardFields,
  } = visual;
  const { actualDuration, extraSP, leftPercent, rightPercent, showExtraSplit } = visual.barMetrics;
  const estimateMapping = useTaskCardEstimateMapping();
  const showTpLabels = isQATask && task.hideTestPointsByIntegration !== true;
  const showPointsLabel = resolveTaskCardEstimateVisibility({
    hideTestPoints: task.hideTestPointsByIntegration === true,
    isQATask,
    mapping: estimateMapping,
    showEstimatesSetting:
      variant === 'swimlane' ? (swimlaneCardFields?.showEstimates ?? true) : true,
    taskId: task.id,
  }).showPrimaryEstimate;

  return (
    <>
      {showExtraSplit && isSwimlane && (
        <TaskCardExtraSplitOverlay
          dividerBgClass={dividerBgClass}
          extraSP={extraSP}
          isDark={isDark}
          isQATask={isQATask}
          isVeryNarrow={isVeryNarrow}
          leftPercent={leftPercent}
          qaRightBgColor={qaRightBgColor}
          rightPercent={rightPercent}
          showPointsLabel={showPointsLabel}
          showTpLabels={showTpLabels}
        />
      )}

      <div
        className={`flex flex-col min-h-0 overflow-hidden${isSwimlane ? ' flex-1' : ''}`}
        style={showExtraSplit && isSwimlane ? { width: `${leftPercent}%` } : undefined}
      >
        <TaskCardBody
          actualDuration={actualDuration}
          assigneeName={assigneeName}
          developers={developers}
          displayDuration={layoutDuration}
          editing={editing}
          isDragging={isDragging}
          isQATask={isQATask}
          isResizing={isResizing}
          phaseCardColorScheme={phaseCardColorScheme}
          task={task}
          variant={variant}
        />
      </div>

      <TaskCardTags
        displayDuration={actualDuration}
        task={task}
        taskPosition={taskPosition}
        variant={variant}
      />

      {children}
    </>
  );
}
