import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';

import {
  getSwimlaneInProgressFactLayerHeightFromLaneCount,
} from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import {
  dateTimeToFractionalCellInRange,
  type StatusPhaseCell,
  statusDurationsToCells,
} from '@/lib/planner-timeline';
import { getPlannerNowMs } from '@/utils/plannerClock';

export interface SegmentWithPhase {
  phase: StatusPhaseCell;
  seg: SwimlaneInProgressFactSegment;
}

/** Как в занятости: фаза closed — не полоса по длительности, а маркер «закрыто» */
export function isClosedFactPhase(phase: StatusPhaseCell): boolean {
  return phase.statusKey.toLowerCase().replace(/\s+/g, '') === 'closed';
}

/**
 * Как фаза дорожки стыкуется с предыдущей:
 * `none` — начало дорожки или другая задача, `joined` — встык с фазой той же задачи,
 * `paused` — та же задача после паузы (между фазами рисуется тонкая связка).
 */
export type FactLaneLinkToPrev = 'joined' | 'none' | 'paused';

/** Зазор между фазами одной задачи (в ячейках), который ещё считается стыком. */
const FACT_PHASE_JOIN_EPSILON_CELLS = 0.05;

export function resolveFactLaneLinksToPrev(laneItems: SegmentWithPhase[]): FactLaneLinkToPrev[] {
  return laneItems.map((item, idx) => {
    const prev = laneItems[idx - 1];
    if (!prev || prev.seg.taskId !== item.seg.taskId) return 'none';
    const gapCells = item.phase.startCell - prev.phase.endCell;
    return gapCells <= FACT_PHASE_JOIN_EPSILON_CELLS ? 'joined' : 'paused';
  });
}

export function buildWithPhases(
  segments: SwimlaneInProgressFactSegment[],
  sprintStartDate: Date,
  nowCell: number,
  timelineStartCell: number,
  totalParts: number
): SegmentWithPhase[] {
  const out: SegmentWithPhase[] = [];
  for (const seg of segments) {
    const cells = statusDurationsToCells(
      sprintStartDate,
      [
        {
          endTime: seg.endTime,
          endTimeMs: seg.endTimeMs,
          startTime: seg.startTime,
          startTimeMs: seg.startTimeMs,
          statusKey: seg.statusKey,
          statusName: seg.statusName,
        },
      ],
      totalParts
    );
    const phase = cells[0];
    if (!phase || phase.endCell <= timelineStartCell || phase.startCell >= nowCell) continue;
    out.push({ phase, seg });
  }
  return out;
}

export function buildLanes(withPhases: SegmentWithPhase[]): SegmentWithPhase[][] {
  if (withPhases.length === 0) return [];
  const maxLane = Math.max(...withPhases.map((x) => x.seg.laneIndex));
  const L: SegmentWithPhase[][] = Array.from({ length: maxLane + 1 }, () => []);
  for (const item of withPhases) {
    L[item.seg.laneIndex]!.push(item);
  }
  for (const lane of L) {
    lane.sort((a, b) => a.phase.startCell - b.phase.startCell);
  }
  const nonEmpty = L.filter((lane) => lane.length > 0);
  nonEmpty.sort((a, b) => {
    const minA = Math.min(...a.map((x) => x.phase.startCell));
    const minB = Math.min(...b.map((x) => x.phase.startCell));
    return minA - minB;
  });
  return nonEmpty;
}

/** Высота дорожки факта по фазам, реально попадающим в таймлайн (как в SwimlaneInProgressFactLayer). */
export function getVisibleSwimlaneFactLayerHeightPx(
  segments: SwimlaneInProgressFactSegment[],
  sprintStartDate: Date,
  totalParts: number,
  nowMs: number = getPlannerNowMs()
): number {
  if (segments.length === 0) return 0;
  const nowCell = Math.min(
    dateTimeToFractionalCellInRange(sprintStartDate, new Date(nowMs), totalParts),
    totalParts
  );
  if (nowCell <= 0) return 0;
  const withPhases = buildWithPhases(segments, sprintStartDate, nowCell, 0, totalParts);
  return getSwimlaneInProgressFactLayerHeightFromLaneCount(buildLanes(withPhases).length);
}
