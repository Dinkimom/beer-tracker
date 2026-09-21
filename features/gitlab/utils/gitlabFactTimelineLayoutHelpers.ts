import type { GitLabFactEvent } from '@/lib/gitlab/mergeRequestFactTypes';

import {
  batchGitlabFactEventsWithinWindow,
  type GitLabFactEventBatch,
} from '@/lib/gitlab/mergeRequestFactTimelineHelpers';
import { dateTimeToFractionalCellInRange } from '@/lib/planner-timeline';

export const GITLAB_FACT_CHIP_SIZE_PX = 22;
export const GITLAB_FACT_CHIP_STACK_GAP_PX = 3;
/** Нижняя полоса статусов факта (без запаса под маркеры). */
export const OCCUPANCY_FACT_STATUS_BAND_PX = 28;

/** Стек источников только если маркеры разных типов в пределах часа. */
const FACT_MARKER_STACK_GAP_MS = 60 * 60 * 1000;

type FactTimelineMarkerSource = 'comment' | 'gitlab' | 'reestimation';

/**
 * От полосы вверх. Сверху вниз: GitLab → переоценка → комментарий.
 */
const SOURCES_FROM_BAR: FactTimelineMarkerSource[] = [
  'comment',
  'reestimation',
  'gitlab',
];

export interface FactTimelineMarkerPoint {
  at: string;
  key: string;
  source: FactTimelineMarkerSource;
}

interface FactTimelineMarkerLayout {
  heightPx: number;
  /** `top` по ключу маркера; без пересечений источников — все у полосы (0). */
  topByKey: Map<string, number>;
}

/**
 * События GitLab для таймлайна факта — подряд идущие одинаковые kind
 * склеиваются при паузе ≤ 1 час.
 */
export function selectGitlabEventsForFactTimeline(
  events: GitLabFactEvent[] | undefined
): GitLabFactEventBatch[] {
  if (!events?.length) return [];
  return batchGitlabFactEventsWithinWindow(events);
}

function clusterMarkerPointsByTime(
  points: FactTimelineMarkerPoint[],
  gapMs: number
): FactTimelineMarkerPoint[][] {
  if (points.length === 0) return [];
  const sorted = [...points].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const clusters: FactTimelineMarkerPoint[][] = [];
  let current: FactTimelineMarkerPoint[] = [sorted[0]];
  let lastAtMs = new Date(sorted[0].at).getTime();

  for (let i = 1; i < sorted.length; i++) {
    const point = sorted[i];
    const atMs = new Date(point.at).getTime();
    if (atMs - lastAtMs <= gapMs) {
      current.push(point);
      lastAtMs = atMs;
      continue;
    }
    clusters.push(current);
    current = [point];
    lastAtMs = atMs;
  }
  clusters.push(current);
  return clusters;
}

function topsForClusterSources(
  sourcesInCluster: Set<FactTimelineMarkerSource>
): Map<FactTimelineMarkerSource, number> {
  const present = SOURCES_FROM_BAR.filter((source) => sourcesInCluster.has(source));
  const pitch = GITLAB_FACT_CHIP_SIZE_PX + GITLAB_FACT_CHIP_STACK_GAP_PX;
  const maxLane = Math.max(0, present.length - 1);
  const tops = new Map<FactTimelineMarkerSource, number>();
  present.forEach((source, laneFromBar) => {
    tops.set(source, (maxLane - laneFromBar) * pitch);
  });
  return tops;
}

/**
 * Раскладка маркеров: вертикальный стек только при пересечении разных источников
 * в цепочке ≤ 1 час. Иначе все у полосы.
 */
export function layoutFactTimelineMarkers(
  points: FactTimelineMarkerPoint[]
): FactTimelineMarkerLayout {
  const topByKey = new Map<string, number>();
  if (points.length === 0) {
    return { heightPx: OCCUPANCY_FACT_STATUS_BAND_PX, topByKey };
  }

  const pitch = GITLAB_FACT_CHIP_SIZE_PX + GITLAB_FACT_CHIP_STACK_GAP_PX;
  const overhang = GITLAB_FACT_CHIP_SIZE_PX / 2 + 2;
  let maxExtraLanes = 0;

  for (const cluster of clusterMarkerPointsByTime(points, FACT_MARKER_STACK_GAP_MS)) {
    const sources = new Set(cluster.map((point) => point.source));
    const sourceTops = topsForClusterSources(sources);
    maxExtraLanes = Math.max(maxExtraLanes, Math.max(0, sources.size - 1));
    for (const point of cluster) {
      topByKey.set(point.key, sourceTops.get(point.source) ?? 0);
    }
  }

  return {
    heightPx: OCCUPANCY_FACT_STATUS_BAND_PX + overhang + maxExtraLanes * pitch,
    topByKey,
  };
}

function collectFactTimelineMarkerPoints(input: {
  commentAts?: string[];
  gitlabEvents?: GitLabFactEvent[];
  reestimationAts?: string[];
  showComments: boolean;
  showGitlab: boolean;
  showReestimations: boolean;
}): FactTimelineMarkerPoint[] {
  const points: FactTimelineMarkerPoint[] = [];
  if (input.showGitlab) {
    selectGitlabEventsForFactTimeline(input.gitlabEvents).forEach((batch, idx) => {
      points.push({
        at: batch.at,
        key: `gitlab:${idx}:${batch.kind}:${batch.at}`,
        source: 'gitlab',
      });
    });
  }
  if (input.showComments) {
    input.commentAts?.forEach((at, idx) => {
      points.push({ at, key: `comment:${idx}:${at}`, source: 'comment' });
    });
  }
  if (input.showReestimations) {
    input.reestimationAts?.forEach((at, idx) => {
      points.push({ at, key: `reestimation:${idx}:${at}`, source: 'reestimation' });
    });
  }
  return points;
}

/**
 * Высота строки таймлайна факта с учётом стека только при пересечениях источников.
 */
export function computeOccupancyFactRowHeightPx(input: {
  commentAts?: string[];
  gitlabEvents?: GitLabFactEvent[];
  reestimationAts?: string[];
  showComments: boolean;
  showGitlab: boolean;
  showReestimations: boolean;
}): number {
  return layoutFactTimelineMarkers(collectFactTimelineMarkerPoints(input)).heightPx;
}

export function computeGitlabMarkerLeftPercent(
  eventAt: string,
  sprintStartDate: Date,
  timelineStartCell: number,
  timelineEndCell: number,
  totalParts: number
): number | null {
  const cellPosition = dateTimeToFractionalCellInRange(
    sprintStartDate,
    new Date(eventAt),
    totalParts
  );
  if (
    cellPosition < timelineStartCell ||
    cellPosition > timelineEndCell ||
    cellPosition < 0 ||
    cellPosition > totalParts
  ) {
    return null;
  }
  const spanCells = timelineEndCell - timelineStartCell;
  if (spanCells <= 0) return null;
  return ((cellPosition - timelineStartCell) / spanCells) * 100;
}
