import type {
  PlanningPhaseCardColorScheme,
  SwimlaneCardFieldsVisibility,
} from '@/hooks/useLocalStorage';
import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';
import type { Developer, Task, TaskCardVariant, TaskPosition } from '@/types';

import React from 'react';

import { formatPointsForDisplay } from '@/lib/pointsUtils';

import { TaskCardBody } from './TaskCardBody';
import { TaskCardSprintBadges } from './TaskCardSprintBadges';
import { TaskCardTags } from './TaskCardTags';

interface TaskCardSidebarResizedSplitProps {
  assigneeName?: string;
  children?: React.ReactNode;
  developers: Developer[];
  dividerBgClass: string;
  estimatedTimeslots: number;
  extraSP: number;
  isDark: boolean;
  isDragging: boolean;
  isQATask: boolean;
  leftPercent: number;
  paddingClasses: string;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  qaRightBgColor?: string;
  qaStripedStyle?: React.CSSProperties;
  rightPercent: number;
  showExtraSplit: boolean;
  showQaStripedLeftOverlay: boolean;
  slaBugDemoteReason?: SlaBugDemoteReason;
  slaBugSignalLabel?: SlaBugLabelKey;
  sprintBadge?: { display: string; id: string } | null;
  swimlaneCardFields: SwimlaneCardFieldsVisibility | undefined;
  task: Task;
  taskPosition?: TaskPosition;
  variant: TaskCardVariant;
}

export function TaskCardSidebarResizedSplit({
  leftPercent,
  rightPercent,
  paddingClasses,
  showQaStripedLeftOverlay,
  qaStripedStyle,
  assigneeName,
  developers,
  estimatedTimeslots,
  isDragging,
  phaseCardColorScheme,
  swimlaneCardFields,
  task,
  variant,
  taskPosition,
  sprintBadge,
  dividerBgClass,
  qaRightBgColor,
  isDark,
  showExtraSplit,
  slaBugDemoteReason,
  slaBugSignalLabel,
  extraSP,
  isQATask,
  children,
}: TaskCardSidebarResizedSplitProps) {
  const showTpLabels = isQATask && task.hideTestPointsByIntegration !== true;
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
          <TaskCardSprintBadges sprintBadge={sprintBadge} />

          <div className="flex flex-col min-h-0">
            <TaskCardBody
              assigneeName={assigneeName}
              developers={developers}
              displayDuration={estimatedTimeslots}
              isDragging={isDragging}
              isQATask={isQATask}
              phaseCardColorScheme={phaseCardColorScheme}
              swimlaneCardFields={swimlaneCardFields}
              task={task}
              variant={variant}
            />
          </div>

          <TaskCardTags
            displayDuration={estimatedTimeslots}
            slaBugDemoteReason={slaBugDemoteReason}
            slaBugSignalLabel={slaBugSignalLabel}
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

        {showExtraSplit && extraSP > 0 && (
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
