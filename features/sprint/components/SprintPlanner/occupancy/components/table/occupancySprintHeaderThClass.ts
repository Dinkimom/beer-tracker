export function occupancySprintHeaderThClass(
  isCurrentSprint: boolean,
  isPastSprint: boolean,
): string {
  if (isCurrentSprint) {
    return 'bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-900/40 dark:to-blue-800/40 text-gray-800 dark:text-gray-200';
  }
  if (isPastSprint) {
    return 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500';
  }
  return 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}
