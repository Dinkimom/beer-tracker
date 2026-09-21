export function sidebarResizeLineClass(
  linesCount: 2 | 3,
  options?: { emphasized?: boolean }
): string {
  const size = `w-0.5 ${linesCount === 3 ? 'h-5' : 'h-4'} rounded-full`;
  const color = options?.emphasized
    ? 'bg-blue-600'
    : 'bg-gray-400 dark:bg-gray-500 group-hover:bg-blue-600';
  return `${size} ${color} transition-colors duration-200`;
}
