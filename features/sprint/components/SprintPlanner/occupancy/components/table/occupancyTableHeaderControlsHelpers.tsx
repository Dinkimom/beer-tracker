import type { OccupancyTaskOrder } from '@/lib/api/types';
import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

type Translate = (key: string) => string;

export function buildOccupancyReorderModeButton(input: {
  isReorderMode: boolean;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
  setIsReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
  t: Translate;
}): ReactNode {
  if (!input.onTaskOrderChange) return null;
  return (
    <Button
      className={`shrink-0 !min-h-0 !px-1.5 !py-1 ${
        input.isReorderMode
          ? ''
          : 'text-gray-500 hover:!text-gray-700 dark:text-gray-400 dark:hover:!text-gray-300'
      }`}
      title={
        input.isReorderMode
          ? input.t('sprintPlanner.occupancy.finishReorder')
          : input.t('sprintPlanner.occupancy.reorderTasks')
      }
      type="button"
      variant={input.isReorderMode ? 'accent' : 'outline'}
      onClick={() => input.setIsReorderMode((prev) => !prev)}
    >
      <Icon className="h-4 w-4" name="grip-vertical" />
    </Button>
  );
}

export function buildOccupancyExpandCollapseButton(input: {
  allExpanded: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  parentIds: string[];
  t: Translate;
}): ReactNode {
  if (!input.parentIds?.length) return null;
  return (
    <Button
      className="shrink-0 !min-h-0 !px-2.5 !py-1 text-xs font-medium"
      title={
        input.allExpanded
          ? input.t('sprintPlanner.occupancy.collapseAllGroups')
          : input.t('sprintPlanner.occupancy.expandAllGroups')
      }
      type="button"
      variant="outline"
      onClick={input.allExpanded ? input.onCollapseAll : input.onExpandAll}
    >
      {input.allExpanded
        ? input.t('sprintPlanner.occupancy.collapseAll')
        : input.t('sprintPlanner.occupancy.expandAll')}
    </Button>
  );
}
