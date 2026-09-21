'use client';

import type { Task } from '@/types';

import { useQuery } from '@tanstack/react-query';

import { getTaskMergeRequestUrl } from '@/features/task/utils/taskUtils';
import { fetchMergeRequestFacts } from '@/lib/api/gitlab';
import { GITLAB_MR_FACT_CACHE_TTL_SECONDS } from '@/lib/gitlab/mergeRequestFactTypes';

const CLIENT_STALE_MS = GITLAB_MR_FACT_CACHE_TTL_SECONDS * 1000;

export function collectMergeRequestLinksFromTasks(tasks: Task[]): string[] {
  const links = new Set<string>();
  for (const task of tasks) {
    const url = getTaskMergeRequestUrl(task);
    if (url) {
      links.add(url);
    }
  }
  return Array.from(links);
}

/**
 * Батч GitLab fact по ссылкам MR. staleTime 10 мин (согласован с серверным кэшем).
 */
export function useMergeRequestFacts(
  organizationId: string | null | undefined,
  links: string[],
  enabled: boolean
) {
  const sortedLinks = [...links].sort();
  return useQuery({
    queryKey: ['gitlab-mr-facts', organizationId ?? '', ...sortedLinks],
    queryFn: () => fetchMergeRequestFacts(organizationId ?? '', sortedLinks),
    enabled: Boolean(organizationId) && enabled && sortedLinks.length > 0,
    staleTime: CLIENT_STALE_MS,
  });
}
