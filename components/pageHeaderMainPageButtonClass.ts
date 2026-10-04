export function pageHeaderMainPageButtonClass(isActive: boolean): string {
  if (isActive) {
    return '!bg-white !text-blue-600 hover:!bg-white dark:!bg-white/10 dark:!text-blue-300 dark:hover:!bg-white/10';
  }
  return '!bg-transparent !text-gray-500 hover:!bg-black/[0.05] hover:!text-gray-900 dark:!text-gray-400 dark:hover:!bg-white/10 dark:hover:!text-gray-100';
}
