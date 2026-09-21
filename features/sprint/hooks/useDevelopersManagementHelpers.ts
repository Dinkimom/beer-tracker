import type { Developer } from '@/types';

type DeveloperWithStats = Developer & { taskCount: number; totalSP: number; totalTP: number };

export function applyCustomDeveloperOrder(
  sorted: DeveloperWithStats[],
  customOrder: string[],
  developers: Developer[]
): boolean {
  const orderSet = new Set(customOrder);
  const allIdsInOrder = developers.every((d) => orderSet.has(d.id));
  if (!allIdsInOrder || developers.length !== customOrder.length) {
    return false;
  }
  const orderMap = new Map(customOrder.map((id, index) => [id, index]));
  sorted.sort((a, b) => {
    const aIndex = orderMap.get(a.id) ?? Infinity;
    const bIndex = orderMap.get(b.id) ?? Infinity;
    return aIndex - bIndex;
  });
  return true;
}

export function applyAutomaticDeveloperSort(
  sorted: DeveloperWithStats[],
  sortBy: string
): void {
  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      break;
    case 'tasks':
      sorted.sort((a, b) => b.taskCount - a.taskCount);
      break;
    case 'sp':
      sorted.sort((a, b) => b.totalSP - a.totalSP);
      break;
    case 'tp':
      sorted.sort((a, b) => b.totalTP - a.totalTP);
      break;
    default:
      break;
  }
}
