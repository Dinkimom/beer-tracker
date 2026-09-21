'use client';

import type { OccupancyTaskOrder } from '@/lib/api/types';

import { SidebarResizeHandle } from '@/components/SidebarResizeHandle';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import {
  buildOccupancyColumnTitleBlock,
  buildOccupancyHeaderControls,
} from './occupancyTableTaskColumnHeaderHelpers';
import { StickyTaskColumnRightEdge } from './StickyTaskColumnRightEdge';

/** full — title+controls; title/controls — две строки мультиспринтовой шапки */
type OccupancyTaskColumnHeaderContent = 'controls' | 'full' | 'title';

interface OccupancyTableTaskColumnHeaderProps {
  allExpanded: boolean;
  content?: OccupancyTaskColumnHeaderContent;
  controlsAtBottom?: boolean;
  headerRowHeight: number;
  isReorderMode: boolean;
  isResizing: boolean;
  parentIds: string[];
  rowDividerClass?: string;
  rowSpan?: number;
  setIsReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
  taskColumnWidth: number;
  totalStoryPoints: number;
  totalTestPoints: number;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
  setIsResizing: (value: boolean) => void;
}

export function OccupancyTableTaskColumnHeader(props: OccupancyTableTaskColumnHeaderProps) {
  const {
    allExpanded,
    content = 'full',
    controlsAtBottom = false,
    headerRowHeight,
    isReorderMode,
    isResizing,
    onCollapseAll,
    onExpandAll,
    onTaskOrderChange,
    parentIds,
    rowDividerClass = '[box-shadow:inset_-1px_0_0_#e5e7eb] dark:[box-shadow:inset_-1px_0_0_#374151]',
    rowSpan,
    setIsReorderMode,
    setIsResizing,
    taskColumnWidth,
    totalStoryPoints,
    totalTestPoints,
  } = props;

  const { t } = useI18n();
  const showTitle = content === 'full' || content === 'title';
  const showControls = content === 'full' || content === 'controls';
  const titleBlock = showTitle
    ? buildOccupancyColumnTitleBlock(controlsAtBottom, totalStoryPoints, totalTestPoints, t)
    : null;
  const controls = showControls
    ? buildOccupancyHeaderControls({
        allExpanded,
        controlsAtBottom,
        isReorderMode,
        onCollapseAll,
        onExpandAll,
        onTaskOrderChange,
        parentIds,
        setIsReorderMode,
        t,
      })
    : null;

  return (
    <th
      className={`relative sticky left-0 z-[11] bg-gray-100 dark:bg-gray-800 px-3 align-middle ${rowDividerClass}`}
      rowSpan={rowSpan}
      style={{
        width: taskColumnWidth,
        minWidth: taskColumnWidth,
        height: rowSpan ? undefined : headerRowHeight,
        minHeight: rowSpan ? rowSpan * headerRowHeight - 1 : headerRowHeight,
        verticalAlign: rowSpan ? 'top' : 'middle',
      }}
    >
      <StickyTaskColumnRightEdge zIndex={ZIndex.stickyMainHeader + 1} />
      {showTitle && (
        <SidebarResizeHandle
          isResizing={isResizing}
          side="right"
          title={t('sprintPlanner.occupancy.resizeTaskColumn')}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(true);
          }}
        />
      )}
      {controlsAtBottom ? (
        <>
          {titleBlock}
          {controls}
        </>
      ) : (
        <div className="flex items-center justify-between gap-2 h-full">
          {titleBlock}
          {controls}
        </div>
      )}
    </th>
  );
}
