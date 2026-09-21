import type { SlaBugSidebarStats } from '@/lib/slaBugs/sidebarStats';
import type { Task } from '@/types';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

interface SlaBugsResponse {
  stats: SlaBugSidebarStats;
  tasks: Task[];
  totalCount: number;
  truncated: boolean;
}

export async function fetchSlaBugs(boardId: number): Promise<SlaBugsResponse> {
  const { data } = await getPlannerBeerTrackerApi().get<SlaBugsResponse>(
    `/boards/${boardId}/sla-bugs`
  );
  return data;
}
