export function pageHeaderMainPageButtonClass(isActive: boolean): string {
  if (isActive) {
    return '!bg-white !text-blue-600 hover:!bg-gray-50 active:!bg-gray-100 dark:!bg-white/10 dark:!text-blue-300 dark:hover:!bg-white/15 dark:active:!bg-white/20';
  }
  return '!bg-transparent !text-gray-500 hover:!bg-black/[0.05] hover:!text-gray-900 active:!bg-black/10 dark:!text-gray-400 dark:hover:!bg-white/10 dark:hover:!text-gray-100 dark:active:!bg-white/15';
}
