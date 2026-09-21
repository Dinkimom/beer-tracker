'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchEpicDeep } from '@/lib/api/epics';

interface FeatureLike {
  id: string;
  key: string;
  name: string;
}

export function useFeature(featureId: string, _boardId: number | null) {
  const query = useQuery({
    queryKey: ['epic-deep', featureId],
    queryFn: async (): Promise<FeatureLike | null> => {
      const res = await fetchEpicDeep(featureId);
      if (!res.epic) return null;
      return {
        id: res.epic.key,
        key: res.epic.key,
        name: res.epic.summary,
      };
    },
    enabled: Boolean(featureId),
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
  };
}

export function useGetFeature(featureId: string) {
  const { data } = useFeature(featureId, null);
  return useMemo(() => data, [data]);
}