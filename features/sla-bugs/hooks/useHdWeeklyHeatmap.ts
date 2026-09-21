import { useQuery } from '@tanstack/react-query';

import { fetchHdWeeklyHeatmap } from '@/lib/api/hdWeeklyHeatmap';

function hdWeeklyHeatmapQueryKey(issueKey: string, createdAt?: string, hdCount?: number) {
  return ['hd-weekly-heatmap', issueKey, createdAt ?? '', hdCount ?? ''] as const;
}

export function useHdWeeklyHeatmap(
  issueKey: string | undefined,
  createdAt: string | undefined,
  hdCount: number | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: hdWeeklyHeatmapQueryKey(issueKey ?? '', createdAt, hdCount),
    queryFn: () => fetchHdWeeklyHeatmap(issueKey!, createdAt, hdCount),
    enabled: enabled && Boolean(issueKey?.trim()),
    staleTime: 5 * 60 * 1000,
  });
}
