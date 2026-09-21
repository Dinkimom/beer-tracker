'use client';

import type { SlaBugChartPriority, SlaBugChartTaskRef } from '@/lib/slaBugs/sidebarStats';

import { useI18n } from '@/contexts/LanguageContext';

interface PriorityBarColumnTooltipContentProps {
  count: number;
  priority: SlaBugChartPriority;
  tasks: SlaBugChartTaskRef[];
}

export function PriorityBarColumnTooltipContent({
  count,
  priority,
  tasks,
}: PriorityBarColumnTooltipContentProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 flex-col gap-2 text-left">
      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
        {t('sidebar.bugsTab.charts.columnTooltipTitle', {
          count: String(count),
          priority,
        })}
      </p>
      <ul className="max-h-48 min-w-0 space-y-1 overflow-y-auto pr-0.5">
        {tasks.map((task) => (
          <li key={task.id} className="min-w-0">
            <a
              className="block min-w-0 break-words rounded px-1 py-0.5 text-xs leading-snug text-blue-600 transition-colors hover:bg-blue-50 hover:underline dark:text-blue-400 dark:hover:bg-blue-950/40"
              href={task.link}
              rel="noopener noreferrer"
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-semibold">{task.id}</span>
              <span className="text-gray-600 dark:text-gray-300"> — {task.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
