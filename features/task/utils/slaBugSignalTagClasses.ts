import type { SlaBugLabelKey } from '@/lib/slaBugs';

export function getSlaBugSignalTagClasses(label: SlaBugLabelKey): string {
  switch (label) {
    case 'sharp_growth':
      return 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200';
    case 'save_sla':
    case 'growth_24h':
    case 'close_to_upgrade':
      return 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
    case 'hd_high':
    case 'hd_medium':
    case 'key_client':
    case 'sup_priority':
      return 'border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-700 dark:bg-orange-900/40 dark:text-orange-200';
    case 'demote':
    case 'close_p4':
      return 'border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-200';
    default:
      return 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-300';
  }
}

export function getSlaBugSignalTagHoverClasses(label: SlaBugLabelKey): string {
  switch (label) {
    case 'sharp_growth':
      return 'hover:border-red-400 hover:bg-red-200 hover:text-red-900 dark:hover:border-red-500 dark:hover:bg-red-900/70 dark:hover:text-red-50';
    case 'save_sla':
    case 'growth_24h':
    case 'close_to_upgrade':
      return 'hover:border-amber-400 hover:bg-amber-200 hover:text-amber-950 dark:hover:border-amber-500 dark:hover:bg-amber-900/70 dark:hover:text-amber-50';
    case 'hd_high':
    case 'hd_medium':
    case 'key_client':
    case 'sup_priority':
      return 'hover:border-orange-400 hover:bg-orange-200 hover:text-orange-950 dark:hover:border-orange-500 dark:hover:bg-orange-900/70 dark:hover:text-orange-50';
    case 'demote':
    case 'close_p4':
      return 'hover:border-violet-400 hover:bg-violet-200 hover:text-violet-950 dark:hover:border-violet-500 dark:hover:bg-violet-900/70 dark:hover:text-violet-50';
    default:
      return 'hover:border-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:border-gray-500 dark:hover:bg-gray-600 dark:hover:text-gray-100';
  }
}
