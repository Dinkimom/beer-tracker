export function pageHeaderMainPageButtonClass(isActive: boolean): string {
  if (isActive) {
    return 'border-gray-200/90 bg-white !text-blue-600 hover:!border-gray-200/90 hover:!bg-white dark:border-transparent dark:bg-gray-800 dark:!text-blue-400 dark:hover:!border-transparent dark:hover:!bg-gray-800';
  }
  return 'border-transparent shadow-none !text-gray-600 hover:!border-transparent hover:!bg-transparent hover:!text-gray-900 dark:!text-gray-400 dark:hover:!bg-transparent dark:hover:!text-gray-200';
}
