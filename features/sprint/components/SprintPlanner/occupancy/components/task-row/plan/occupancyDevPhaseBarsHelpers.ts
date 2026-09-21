import type { PositionPreview } from './occupancyPhaseBar.types';
import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';
import type { TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { getTeamTagClasses } from '@/utils/teamColors';

import {
  computeDevPhaseBarHoverFlags,
  computeDevPhaseBarLinkFlags,
} from './occupancyDevPhaseBarFlagsHelpers';

/** Сортировка отрезков фазы по таймлайну (день + часть дня). */
export function sortPhaseSegmentsByTimeline<T extends { startDay: number; startPart: number }>(
  segments: T[]
): T[] {
  return [...segments].sort(
    (a, b) =>
      a.startDay * PARTS_PER_DAY + a.startPart - (b.startDay * PARTS_PER_DAY + b.startPart)
  );
}

/** Склонение «день / дня / дней» для целого n (рус.). */
export function ruDaysInflection(n: number): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'день';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'дня';
  return 'дней';
}

/** Подпись длительности фазы разработки в квартальном режиме. */
export function quarterlyDevPhaseDurationLabel(
  quarterlyPhaseStyle: boolean,
  durationInParts: number
): string | undefined {
  if (!quarterlyPhaseStyle) return undefined;
  const durationDays = durationInParts / PARTS_PER_DAY;
  const daysRounded = Math.round(durationDays);
  return `Разработка - ${daysRounded} ${ruDaysInflection(daysRounded)}`;
}

/** Чужой occupancy-жест: сдвигаем полосу, не дожидаясь sprint.changed. */
export function applyOccupancyBarPositionPreview(
  position: TaskPosition,
  preview: PositionPreview | undefined
): TaskPosition {
  if (!preview) {
    return position;
  }
  return {
    ...position,
    duration: preview.duration,
    startDay: preview.startDay,
    startPart: preview.startPart,
  };
}

export function resolveDevPhaseBarLayout(phaseBarHeightPx: number, phaseBarTopOffsetPx: number) {
  const planToSprintBarGapPx = 8;
  return {
    planBarHeight: phaseBarHeightPx,
    planBarTop: phaseBarTopOffsetPx,
    sprintBarTop: phaseBarTopOffsetPx + phaseBarHeightPx + planToSprintBarGapPx,
  };
}

export function buildDevPhaseBarSharedFlags(props: OccupancyPlanPhaseBarsProps, taskId: string) {
  const {
    hoverConnectedPhaseIds,
    hoveredErrorTaskId,
    linkingFromTaskId,
    occupancyErrorTaskIds,
    overlappingTaskIds,
    quarterlyPhaseStyle,
    qaTask,
    positionPreviews,
    segmentEditTaskId,
    task,
    timelineSettings,
    validTargetByTime,
    linkAlreadyExistsFromSource,
  } = props;

  return {
    disableDragAndResize: linkingFromTaskId != null,
    errorTooltip: quarterlyPhaseStyle ? undefined : props.getErrorTooltip(taskId),
    hideExtraDuration: quarterlyPhaseStyle || segmentEditTaskId != null,
    hideLinkRing: linkingFromTaskId != null,
    hoveredErrorTaskId,
    isBlurredBySiblingDrag:
      (timelineSettings.showFreeSlotPreview ?? true) && qaTask != null && positionPreviews.has(qaTask.id),
    ...computeDevPhaseBarHoverFlags({ hoverConnectedPhaseIds, linkingFromTaskId, taskId }),
    isInError: quarterlyPhaseStyle ? false : occupancyErrorTaskIds.has(taskId),
    ...computeDevPhaseBarLinkFlags({
      linkAlreadyExistsFromSource,
      linkingFromTaskId,
      taskId,
      validTargetByTime,
    }),
    isOverlapping: overlappingTaskIds?.has(taskId) ?? false,
    badgeClass: props.effectivelyQa ? getTeamTagClasses('QA') : getTeamTagClasses(task.team),
    planPhaseDurationLabel: quarterlyDevPhaseDurationLabel(quarterlyPhaseStyle, props.position?.duration ?? 0),
  };
}
