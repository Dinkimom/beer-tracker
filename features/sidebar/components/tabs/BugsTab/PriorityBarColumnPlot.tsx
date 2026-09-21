import type { SlaBugChartPriority } from '@/lib/slaBugs/sidebarStats';

import { slaBugPriorityBarColor } from './slaBugPriorityBarColors';

const PLOT_HEIGHT_PX = 72;

interface PriorityBarColumnPlotProps {
  barHeight: number;
  count: number;
  hasValue: boolean;
  priority: SlaBugChartPriority;
}

export function PriorityBarColumnPlot({
  barHeight,
  count,
  hasValue,
  priority,
}: PriorityBarColumnPlotProps) {
  return (
    <div
      className="relative flex w-full flex-col items-center justify-end"
      style={{ height: PLOT_HEIGHT_PX + 14 }}
    >
      {hasValue ? (
        <span className="relative z-[1] mb-1 text-[11px] font-semibold tabular-nums text-gray-500 transition-colors group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-100">
          {count}
        </span>
      ) : null}

      {hasValue ? (
        <div
          aria-hidden
          className={`relative z-[1] w-full max-w-[1.75rem] rounded-t-md transition-all duration-150 ease-out group-hover:brightness-110 group-active:brightness-95 ${slaBugPriorityBarColor(priority)}`}
          style={{ height: barHeight }}
        />
      ) : (
        <div
          aria-hidden
          className={`h-0.5 w-full max-w-[1.25rem] rounded-full opacity-70 ${slaBugPriorityBarColor(priority)}`}
        />
      )}
    </div>
  );
}
