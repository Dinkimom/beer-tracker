import type { SidebarGroupBy } from '@/types';

export function sidebarTaskGroupContainerClass(
  groupBy: SidebarGroupBy,
  isLastGroup: boolean
): string {
  if (groupBy === 'none') {
    return '';
  }
  if (!isLastGroup) {
    return 'mb-4';
  }
  return '';
}
