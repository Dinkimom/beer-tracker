import type { OccupancyTaskOrder } from '@/lib/api/types';

import {
  buildOccupancyExpandCollapseButton,
  buildOccupancyReorderModeButton,
} from './occupancyTableHeaderControlsHelpers';

type Translate = (key: string) => string;

export function buildOccupancyColumnTitleBlock(
  controlsAtBottom: boolean,
  totalStoryPoints: number,
  totalTestPoints: number,
  t: Translate
): React.ReactNode {
  return (
    <h3
      className={`text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex items-baseline gap-2 ${controlsAtBottom ? 'pt-1' : ''}`}
    >
      <span className="truncate">{t('sprintPlanner.occupancy.columnTitle')}</span>
      <span className="text-xs font-normal text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {totalStoryPoints} sp
        <span className="mx-1.5 text-gray-400 dark:text-gray-500">·</span>
        {totalTestPoints} tp
      </span>
    </h3>
  );
}

export function buildOccupancyHeaderControls(input: {
  allExpanded: boolean;
  controlsAtBottom: boolean;
  isReorderMode: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
  parentIds: string[];
  setIsReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
  t: Translate;
}): React.ReactNode {
  const controlsClass = input.controlsAtBottom
    ? 'flex items-center gap-1.5 mt-auto pb-1 absolute bottom-0 left-0 right-0 px-3'
    : 'flex items-center gap-1.5 shrink-0';

  return (
    <div className={controlsClass}>
      {buildOccupancyReorderModeButton({
        isReorderMode: input.isReorderMode,
        onTaskOrderChange: input.onTaskOrderChange,
        setIsReorderMode: input.setIsReorderMode,
        t: input.t,
      })}
      {buildOccupancyExpandCollapseButton({
        allExpanded: input.allExpanded,
        onCollapseAll: input.onCollapseAll,
        onExpandAll: input.onExpandAll,
        parentIds: input.parentIds,
        t: input.t,
      })}
    </div>
  );
}
