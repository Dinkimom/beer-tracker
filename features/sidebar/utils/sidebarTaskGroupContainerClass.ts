import type { SidebarGroupBy } from '@/types';

export function sidebarTaskGroupContainerClass(
  groupBy: SidebarGroupBy,
  isLastGroup: boolean
): string {
  if (groupBy === 'none') {
    return '';
  }
  if (!isLastGroup) {
    return 'mb-4 pb-4';
  }
  return 'mb-4';
}
