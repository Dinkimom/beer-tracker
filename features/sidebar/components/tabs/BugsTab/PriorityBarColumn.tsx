'use client';

import type { SlaBugChartPriority, SlaBugChartTaskRef } from '@/lib/slaBugs/sidebarStats';

import { TextTooltip } from '@/components/TextTooltip';

import { BUGS_TAB_CHART_COLUMN_TOOLTIP_SHELL_CLASS } from './bugsTabTooltipShellClass';
import { PriorityBarColumnPlot } from './PriorityBarColumnPlot';
import { PriorityBarColumnTooltipContent } from './PriorityBarColumnTooltipContent';

function priorityBarButtonClassName(hasValue: boolean): string {
  const interactiveClass = hasValue
    ? 'cursor-pointer border-transparent hover:border-gray-300 hover:bg-white/90 active:scale-[0.98] dark:hover:border-gray-500 dark:hover:bg-gray-800/90'
    : 'cursor-default border-transparent';
  return `group flex min-w-0 flex-col items-center rounded-md border px-0.5 pb-0.5 transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 ${interactiveClass}`;
}

function priorityBarLabelClassName(hasValue: boolean): string {
  const valueClass = hasValue
    ? 'text-gray-600 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-50'
    : 'text-gray-600 dark:text-gray-300';
  return `mt-1.5 text-[11px] font-semibold tabular-nums transition-colors ${valueClass}`;
}

function stopDragActivation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

interface PriorityBarColumnTooltipProps {
  barHeight: number;
  count: number;
  hasValue: boolean;
  priority: SlaBugChartPriority;
  tasks: SlaBugChartTaskRef[];
}

export function PriorityBarColumn({
  barHeight,
  count,
  hasValue,
  priority,
  tasks,
}: PriorityBarColumnTooltipProps) {
  const column = (
    <button
      aria-label={hasValue ? `${priority}: ${count}` : priority}
      className={priorityBarButtonClassName(hasValue)}
      type="button"
      onMouseDown={stopDragActivation}
      onPointerDown={stopDragActivation}
      onTouchStart={stopDragActivation}
    >
      <PriorityBarColumnPlot
        barHeight={barHeight}
        count={count}
        hasValue={hasValue}
        priority={priority}
      />

      <span className={priorityBarLabelClassName(hasValue)}>
        {priority}
      </span>
    </button>
  );

  if (!hasValue || tasks.length === 0) {
    return column;
  }

  return (
    <TextTooltip
      content={
        <PriorityBarColumnTooltipContent count={count} priority={priority} tasks={tasks} />
      }
      contentClassName={BUGS_TAB_CHART_COLUMN_TOOLTIP_SHELL_CLASS}
      delayDuration={150}
      interactive
      side="bottom"
      sideOffset={8}
    >
      {column}
    </TextTooltip>
  );
}
