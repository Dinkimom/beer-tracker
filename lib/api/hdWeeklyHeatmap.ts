import type { HdWeeklyHeatmapPayload } from '@/lib/overseer/hdWeeklyHeatmap';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function fetchHdWeeklyHeatmap(
  issueKey: string,
  createdAt?: string,
  hdCount?: number
): Promise<HdWeeklyHeatmapPayload> {
  const params = new URLSearchParams();
  if (createdAt?.trim()) {
    params.set('createdAt', createdAt.trim());
  }
  if (hdCount != null && hdCount >= 0) {
    params.set('hdCount', String(Math.trunc(hdCount)));
  }
  const query = params.toString();
  const basePath = `/issues/${encodeURIComponent(issueKey)}/hd-weekly-heatmap`;
  const url = query ? `${basePath}?${query}` : basePath;
  const { data } = await getPlannerBeerTrackerApi().get<HdWeeklyHeatmapPayload>(url);
  return data;
}
