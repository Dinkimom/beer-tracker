'use client';

import type { PositionPreview } from '../OccupancyPhaseBar';
import type { Task, TaskPosition } from '@/types';

import { Button } from '@/components/Button';
import { CardLinkIcon } from '@/components/CardLinkIcon';
import { Icon } from '@/components/Icon';
import { positionToEndCell } from '@/features/sprint/utils/occupancyUtils';

import { resolveOccupancyLinkStartPhaseId } from './occupancyLinkButtonHelpers';

function resolveOccupancyLinkButtonClickAction(input: {
  isLinkModeActive: boolean;
  onCancelLinking?: () => void;
  onStartLinking?: (taskId: string) => void;
  startPhaseId: string;
}): (e: React.MouseEvent) => void {
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (input.isLinkModeActive && input.onCancelLinking) {
      input.onCancelLinking();
      (e.currentTarget as HTMLButtonElement)?.blur();
      return;
    }
    input.onStartLinking?.(input.startPhaseId);
  };
}

function occupancyLinkButtonOpacityClass(isLinkModeActive: boolean): string {
  return isLinkModeActive
    ? 'opacity-100'
    : 'opacity-0 group-hover/phase-row:opacity-100 hover:!opacity-100 focus-visible:!opacity-100';
}

function shouldRenderOccupancyLinkButton(input: {
  isPhaseBeingDraggedOrResized: boolean;
  linkingFromTaskId: string | null;
  onStartLinking?: (taskId: string) => void;
  startPhaseId: string | null;
}): boolean {
  if (!input.onStartLinking || !input.startPhaseId) return false;
  if (input.linkingFromTaskId != null && input.linkingFromTaskId !== input.startPhaseId) return false;
  if (input.isPhaseBeingDraggedOrResized) return false;
  return true;
}

function isOccupancyPhaseBeingDraggedOrResized(input: {
  positionPreviews: Map<string, PositionPreview>;
  qaTask?: Task;
  task: Task;
}) {
  return (
    input.positionPreviews.has(input.task.id) ||
    (input.qaTask != null && input.positionPreviews.has(input.qaTask.id))
  );
}

interface OccupancyLinkButtonProps {
  linkingFromTaskId: string | null;
  phaseBarHeightPx: number;
  phaseBarTopOffsetPx: number;
  position?: TaskPosition;
  positionPreviews: Map<string, PositionPreview>;
  qaPosition?: TaskPosition;
  qaTask?: Task;
  task: Task;
  totalParts: number;
  onCancelLinking?: () => void;
  onStartLinking?: (taskId: string) => void;
}

function computeOccupancyLinkButtonLayout(
  position: TaskPosition | undefined,
  qaPosition: TaskPosition | undefined,
  qaTask: Task | undefined,
  totalParts: number,
  phaseBarHeightPx: number,
  phaseBarTopOffsetPx: number
) {
  const devEndCell = position ? positionToEndCell(position) : 0;
  const qaEndCell = qaPosition && qaTask ? positionToEndCell(qaPosition) : 0;
  const rightEdgePercent =
    totalParts > 0 ? (Math.max(devEndCell, qaEndCell) / totalParts) * 100 : 0;
  const phaseBarCenterTop = phaseBarTopOffsetPx + phaseBarHeightPx / 2;
  const buttonHeightPx = 24;
  return {
    rightEdgePercent,
    top: phaseBarCenterTop - buttonHeightPx / 2,
  };
}

export function OccupancyLinkButton(props: OccupancyLinkButtonProps) {
  const startPhaseId = resolveOccupancyLinkStartPhaseId(
    props.position,
    props.qaPosition,
    props.task,
    props.qaTask
  );
  const isPhaseBeingDraggedOrResized = isOccupancyPhaseBeingDraggedOrResized({
    positionPreviews: props.positionPreviews,
    qaTask: props.qaTask,
    task: props.task,
  });

  if (
    !shouldRenderOccupancyLinkButton({
      isPhaseBeingDraggedOrResized,
      linkingFromTaskId: props.linkingFromTaskId,
      onStartLinking: props.onStartLinking,
      startPhaseId,
    })
  ) {
    return null;
  }

  const isLinkModeActive = props.linkingFromTaskId === startPhaseId;
  const layout = computeOccupancyLinkButtonLayout(
    props.position,
    props.qaPosition,
    props.qaTask,
    props.totalParts,
    props.phaseBarHeightPx,
    props.phaseBarTopOffsetPx
  );

  return (
    <div
      className="absolute w-8 flex items-center justify-end pointer-events-auto z-[100]"
      data-occupancy-link-cancel
      style={{ left: `calc(${layout.rightEdgePercent}% + 0px)`, top: layout.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Button
        className={`!h-6 !w-6 !min-h-0 !min-w-0 !justify-center !p-0 text-blue-600 shadow-sm transition-opacity duration-300 ease-out transition-shadow duration-200 hover:!shadow-lg focus-visible:outline-none dark:text-blue-400 !bg-white !border-gray-200 hover:!bg-blue-50 dark:!bg-gray-800 dark:!border-gray-600 dark:hover:!bg-blue-900/30 ${occupancyLinkButtonOpacityClass(isLinkModeActive)}`}
        title={isLinkModeActive ? 'Закрыть режим связей' : 'Связать с другой фазой'}
        type="button"
        variant="outline"
        onClick={resolveOccupancyLinkButtonClickAction({
          isLinkModeActive,
          onCancelLinking: props.onCancelLinking,
          onStartLinking: props.onStartLinking,
          startPhaseId: startPhaseId!,
        })}
      >
        {isLinkModeActive ? (
          <Icon className="h-3.5 w-3.5" name="x" />
        ) : (
          <CardLinkIcon className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
