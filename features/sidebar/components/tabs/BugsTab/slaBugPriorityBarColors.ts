import type { SlaBugChartPriority } from '@/lib/slaBugs/sidebarStats';

export function slaBugPriorityBarColor(priority: SlaBugChartPriority): string {
  switch (priority) {
    case 'P0':
      return 'bg-red-500 dark:bg-red-400';
    case 'P1':
    case 'P2':
      return 'bg-orange-500 dark:bg-orange-400';
    case 'P3':
      return 'bg-amber-400 dark:bg-yellow-400';
    case 'P4':
      return 'bg-gray-400 dark:bg-gray-500';
  }
}
