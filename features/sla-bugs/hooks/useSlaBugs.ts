import { useQuery } from '@tanstack/react-query';

import { fetchSlaBugs } from '@/lib/api/slaBugs';

export function slaBugsQueryKey(boardId: number | null) {
  return ['sla-bugs', boardId] as const;
}

/** Не включать на первой отрисовке планера: запрос тяжёлый и конкурирует с tracker/positions. */
export function useSlaBugs(boardId: number | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: slaBugsQueryKey(boardId ?? null),
    queryFn: () => fetchSlaBugs(boardId!),
    enabled: enabled && boardId != null && boardId > 0,
    staleTime: 2 * 60 * 1000,
  });
}
