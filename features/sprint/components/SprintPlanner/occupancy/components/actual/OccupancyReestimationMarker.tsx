'use client';

import type { ReestimationEvent } from './occupancyActualPhasesHelpers';
import type { Developer } from '@/types';

import { Avatar } from '@/components/Avatar';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { getInitials } from '@/utils/displayUtils';

import {
  computeReestimationMarkerLeftPercent,
  formatReestimationLabel,
  isReestimationCellVisible,
} from './occupancyActualPhasesHelpers';

const REESTIMATION_TOP_OFFSET_PX = -17;

interface OccupancyReestimationMarkerProps {
  developerMap: Map<string, Developer>;
  ev: ReestimationEvent;
  idx: number;
  nowCell: number;
  taskId: string;
  timelineStartCell: number;
  /** Смещение относительно верха строки факта (стек маркеров). */
  topPx?: number;
  totalParts: number;
  toCell: (d: Date) => number;
}

export function OccupancyReestimationMarker({
  ev,
  idx,
  taskId,
  developerMap,
  toCell,
  timelineStartCell,
  nowCell,
  topPx,
  totalParts,
}: OccupancyReestimationMarkerProps) {
  const cellPosition = toCell(new Date(ev.updatedAt));
  if (!isReestimationCellVisible(cellPosition, timelineStartCell, nowCell, totalParts)) {
    return null;
  }

  const leftPercentEv = computeReestimationMarkerLeftPercent(cellPosition, timelineStartCell, nowCell);
  const label = formatReestimationLabel(ev.deltaSP, ev.deltaTP);
  const authorName = ev.createdBy?.display ?? 'Неизвестно';
  const authorId = ev.createdBy?.id;
  const developer = authorId ? developerMap.get(authorId) : undefined;
  const displayName = developer?.name ?? authorName;
  const avatarUrl = developer?.avatarUrl;
  const formattedDate = new Date(ev.updatedAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TextTooltip
      key={`${taskId}-reest-${idx}-${ev.updatedAt}`}
      content={
        <div className="max-w-sm overflow-hidden rounded-lg">
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-lg">
            <Avatar
              avatarUrl={avatarUrl}
              className="flex-shrink-0 shadow-sm"
              initials={getInitials(displayName)}
              initialsVariant="primary"
              size="lg"
            />
            <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {displayName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formattedDate}
              </div>
            </div>
          </div>
          <div className="px-3 py-2.5">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {label}
            </span>
          </div>
        </div>
      }
      contentClassName="!bg-white dark:!bg-gray-800 !p-0 !shadow-2xl !border !border-gray-200 dark:!border-gray-700 !rounded-lg !overflow-hidden"
      delayDuration={150}
      interactive
      side="top"
    >
      <span
        className="absolute inline-block pointer-events-auto cursor-pointer hover:[&>*]:scale-105 hover:[&>*]:shadow-lg transition-all duration-200 [&>*]:shadow-md"
        style={{
          left: `${leftPercentEv}%`,
          top: topPx ?? REESTIMATION_TOP_OFFSET_PX,
          zIndex: ZIndex.stickyInContent,
          transform: 'translateX(-50%)',
        }}
      >
        <span className="inline-block text-[9px] font-medium leading-none px-1 py-px rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 whitespace-nowrap shadow-md">
          {label}
        </span>
      </span>
    </TextTooltip>
  );
}
