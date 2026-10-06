'use client';

import type { AssigneeVelocityPoint } from '@/lib/sprints/assigneeVelocity';
import type { SprintListItem } from '@/types/tracker';
import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import {
  resolveAssigneeVelocityReadout,
  type AssigneeVelocityReadout,
} from '@/features/swimlane/utils/assigneeVelocityReadout';
import { fetchAssigneeVelocity } from '@/lib/api/sprints';
import {
  ASSIGNEE_VELOCITY_SPRINT_WINDOW,
  assigneeVelocityNameKey,
  selectRecentFinishedSprints,
} from '@/lib/sprints/assigneeVelocity';

const ASSIGNEE_VELOCITY_STALE_MS = 30 * 60 * 1000;

interface AssigneeVelocityContextValue {
  byAssignee: ReadonlyMap<string, AssigneeVelocityPoint>;
  byName: ReadonlyMap<string, AssigneeVelocityPoint>;
}

const EMPTY_VELOCITY: AssigneeVelocityContextValue = {
  byAssignee: new Map(),
  byName: new Map(),
};

const AssigneeVelocityContext = createContext<AssigneeVelocityContextValue>(EMPTY_VELOCITY);

export function AssigneeVelocityProvider({
  children,
  selectedSprintId,
  sprints,
}: {
  children: ReactNode;
  selectedSprintId: number | null;
  sprints: SprintListItem[];
}) {
  const isDemoPlanner = useDemoPlannerBoardsQueryScope();
  const sprintIds = useMemo(
    () =>
      selectRecentFinishedSprints(sprints, selectedSprintId, ASSIGNEE_VELOCITY_SPRINT_WINDOW).map(
        (sprint) => sprint.id
      ),
    [selectedSprintId, sprints]
  );
  const query = useQuery({
    queryKey: ['assignee-velocity', 'participating-sprints', sprintIds],
    queryFn: () => fetchAssigneeVelocity(sprintIds),
    enabled: !isDemoPlanner && sprintIds.length > 0,
    staleTime: ASSIGNEE_VELOCITY_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const value = useMemo<AssigneeVelocityContextValue>(() => {
    const byAssignee = query.data?.byAssignee;
    if (!byAssignee) return EMPTY_VELOCITY;
    return {
      byAssignee: new Map(Object.entries(byAssignee)),
      byName: new Map(Object.entries(query.data?.byName ?? {})),
    };
  }, [query.data]);

  return (
    <AssigneeVelocityContext.Provider value={value}>{children}</AssigneeVelocityContext.Provider>
  );
}

export function useAssigneeVelocityReadout(
  assigneeId: string,
  assigneeName: string,
  role: 'developer' | 'other' | 'tester' | undefined
): (AssigneeVelocityReadout & { sprintCount: number }) | null {
  const { byAssignee, byName } = useContext(AssigneeVelocityContext);
  const entry =
    byAssignee.get(assigneeId) ?? byName.get(assigneeVelocityNameKey(assigneeName));
  const readout = resolveAssigneeVelocityReadout(entry, role);
  if (!entry || !readout) return null;
  const counted = readout.unit === 'tp' ? entry.tpSprintCount : entry.spSprintCount;
  if (!Number.isFinite(counted) || counted <= 0) return null;
  return { ...readout, sprintCount: counted };
}
