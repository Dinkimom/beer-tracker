import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';

import {
  getSwimlaneInProgressFactLayerHeightFromLaneCount,
} from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import {
  dateTimeToFractionalCellInRange,
  type StatusPhaseCell,
  statusDurationsToCells,
} from '@/lib/planner-timeline';

export interface SegmentWithPhase {
  phase: StatusPhaseCell;
  seg: SwimlaneInProgressFactSegment;
}

/** Как в занятости: фаза closed — не полоса по длительности, а маркер «закрыто» */
export function isClosedFactPhase(phase: StatusPhaseCell): boolean {
  return phase.statusKey.toLowerCase().replace(/\s+/g, '') === 'closed';
}

/** Стабильный id DOM для SVG-стрелок (только [a-zA-Z0-9_-]) */
export function swimlaneFactBarElementId(
  layerId: string,
  seg: Pick<SwimlaneInProgressFactSegment, 'endTimeMs' | 'startTimeMs' | 'taskId'>
): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `factbar_${safe}_${seg.taskId}_${seg.startTimeMs}_${seg.endTimeMs}`;
}

export function hexToRgbaArrow(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Маска таймлайна факта: выходные колонки прозрачные, штриховка дня под ними остаётся. */
export function factTimelineHolidayMask(
  holidayDayIndices: ReadonlySet<number> | undefined,
  totalParts: number,
  partsPerDay: number
): string | undefined {
  if (!holidayDayIndices || holidayDayIndices.size === 0 || totalParts <= 0 || partsPerDay <= 0) {
    return undefined;
  }
  const holes = [...holidayDayIndices]
    .filter((day) => day >= 0)
    .map((day) => ({
      end: Math.min(totalParts, (day + 1) * partsPerDay) / totalParts,
      start: (day * partsPerDay) / totalParts,
    }))
    .filter((hole) => hole.end > hole.start && hole.start < 1)
    .sort((a, b) => a.start - b.start);
  if (holes.length === 0) return undefined;

  const stops = ['#000 0%'];
  let cursor = 0;
  for (const hole of holes) {
    const start = Math.max(hole.start, cursor);
    const end = Math.min(hole.end, 1);
    if (end <= start) continue;
    const startPct = (start * 100).toFixed(4);
    const endPct = (end * 100).toFixed(4);
    if (start > cursor) stops.push(`#000 ${startPct}%`);
    stops.push(`transparent ${startPct}%`);
    stops.push(`transparent ${endPct}%`);
    stops.push(`#000 ${endPct}%`);
    cursor = end;
    if (cursor >= 1) break;
  }
  if (cursor < 1) stops.push('#000 100%');
  return `linear-gradient(to right, ${stops.join(', ')})`;
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
  nowMs: number = Date.now()
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
