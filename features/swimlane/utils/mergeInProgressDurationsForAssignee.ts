/**
 * Фазы таймлайна факта под свимлейном.
 * — Строка тестировщика (QA):
 *   · inProgress/review/defect/blocked — только «чисто QA» (0 СП, ТП > 0; при originalTaskId — исходная не dev+тест: СП, 0 СП+ТП+QA, не QA-платформа и исполнитель не QA).
 *   · иначе — воронка теста (в т.ч. дефект/заблокировано) + закрыто.
 *   Changelog [QA] подмешивается с dev по originalTaskId при необходимости.
 * — Строка разработчика: «В работе», «На ревью», дефект/заблокировано, «Закрыто» — без readyForTest / inTesting.
 * Отдельная полоса на каждую задачу и тип фазы; пересечения по времени — разные laneIndex.
 */

import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { Developer, Task, TaskPosition } from '@/types';

import { OCCUPANCY_FACT_PHASE_GAP_PX } from '@/lib/planner-timeline';

import {
  buildMergedFactIntervalsForAssignee,
  mapMergedIntervalsToFactSegments,
} from './mergeInProgressDurationsForAssigneeBuildHelpers';
import {
  mergeIssueDataForSwimlaneFactTooltip,
} from './mergeInProgressDurationsForAssigneeHelpers';

export type SwimlaneInProgressFactSegment = StatusDuration & {
  laneIndex: number;
  taskId: string;
};

export { mergeIssueDataForSwimlaneFactTooltip };

/**
 * Сегменты таймлайна факта для строки свимлейна исполнителя.
 * tasksMap нужен, чтобы для [QA]-карточки подтянуть changelog по originalTaskId.
 */
export function buildSwimlaneInProgressFactSegmentsForAssignee(
  developerId: string,
  swimlaneAssigneeRole: Developer['role'],
  taskPositions: Map<string, TaskPosition>,
  durationsByTaskId: Map<string, StatusDuration[]>,
  tasksMap: Map<string, Task>
): SwimlaneInProgressFactSegment[] {
  const perTaskMerged = buildMergedFactIntervalsForAssignee(
    developerId,
    swimlaneAssigneeRole,
    taskPositions,
    durationsByTaskId,
    tasksMap
  );
  if (perTaskMerged.length === 0) return [];
  return mapMergedIntervalsToFactSegments(perTaskMerged, Date.now());
}

/** Число горизонтальных дорожек (минимум 1, если есть сегменты) */
function getSwimlaneInProgressLaneCount(segments: SwimlaneInProgressFactSegment[]): number {
  if (segments.length === 0) return 0;
  return Math.max(1, ...segments.map((s) => s.laneIndex + 1));
}

/** Высота одной дорожки «колбасы» (px) */
export const SWIMLANE_IN_PROGRESS_LANE_ROW_HEIGHT = 22;
/** Отступ над верхней дорожкой факта (от карточек задач) */
export const SWIMLANE_IN_PROGRESS_FACT_TOP_INSET_PX = 8;
/** Отступ под нижней дорожкой факта до границы / следующей дорожки */
export const SWIMLANE_IN_PROGRESS_FACT_BOTTOM_INSET_PX = 8;

export function getSwimlaneInProgressFactLayerHeightFromLaneCount(laneCount: number): number {
  if (laneCount <= 0) return 0;
  const lanesHeight =
    laneCount * SWIMLANE_IN_PROGRESS_LANE_ROW_HEIGHT +
    (laneCount - 1) * OCCUPANCY_FACT_PHASE_GAP_PX;
  return (
    lanesHeight +
    SWIMLANE_IN_PROGRESS_FACT_TOP_INSET_PX +
    SWIMLANE_IN_PROGRESS_FACT_BOTTOM_INSET_PX
  );
}

export function getSwimlaneInProgressFactLayerHeightPx(segments: SwimlaneInProgressFactSegment[]): number {
  return getSwimlaneInProgressFactLayerHeightFromLaneCount(getSwimlaneInProgressLaneCount(segments));
}
