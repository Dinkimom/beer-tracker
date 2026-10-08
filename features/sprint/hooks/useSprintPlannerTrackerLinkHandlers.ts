'use client';

import type { Task, TaskLink } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { useSprintTrackerIssueLinks } from '@/features/sprint/hooks/useSprintTrackerIssueLinks';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { createIssueLink, deleteIssueLink } from '@/lib/api/issues';
import {
  isPlannerCommentLinkEndpoint,
  plannerLinkInvolvesComment,
} from '@/lib/planner/plannerLinkPersistence';
import {
  mergePlannerAndTrackerTaskLinks,
  parseTrackerOverlayLinkId,
  toTrackerOverlayLinkId,
} from '@/lib/planner/trackerLinkOverlay';

function resolveTrackerIssueKey(
  endpointId: string,
  tasksMap: Map<string, Task>,
  allTasksForDrag: Task[]
): string | null {
  if (isPlannerCommentLinkEndpoint(endpointId)) {
    return null;
  }
  const task = tasksMap.get(endpointId) ?? allTasksForDrag.find((item) => item.id === endpointId);
  if (task) {
    return getTaskTrackerDisplayKey(task);
  }
  return endpointId.trim() || null;
}

export function useSprintPlannerTrackerLinkHandlers(input: {
  allTasksForDrag: Task[];
  enabled: boolean;
  saveLink: (link: {
    fromTaskId: string;
    id: string;
    toTaskId: string;
  }) => Promise<unknown>;
  selectedSprintId: number | null;
  setTaskLinks: Dispatch<SetStateAction<TaskLink[]>>;
  tasksMap: Map<string, Task>;
}) {
  const queryClient = useQueryClient();
  const [optimisticTrackerLinks, setOptimisticTrackerLinks] = useState<TaskLink[]>([]);

  const trackerLinksFromApi = useSprintTrackerIssueLinks({
    enabled: input.enabled,
    sprintId: input.selectedSprintId,
    tasks: input.allTasksForDrag,
  });

  const trackerTaskLinks = useMemo(
    () => mergePlannerAndTrackerTaskLinks(trackerLinksFromApi, optimisticTrackerLinks),
    [optimisticTrackerLinks, trackerLinksFromApi]
  );

  const invalidateTrackerIssueLinks = useCallback(() => {
    queryClient
      .invalidateQueries({ queryKey: ['sprint-tracker-issue-links'] })
      .catch(() => undefined);
  }, [queryClient]);

  const savePlannerLinkOnly = useCallback(
    async (link: { fromTaskId: string; id: string; toTaskId: string }) => {
      if (!plannerLinkInvolvesComment(link.fromTaskId, link.toTaskId)) {
        return;
      }
      await input.saveLink(link);
    },
    [input]
  );

  const handleAddLink = useCallback(
    (link: { fromTaskId: string; id: string; toTaskId: string }) => {
      if (plannerLinkInvolvesComment(link.fromTaskId, link.toTaskId)) {
        const plannerLink: TaskLink = { ...link, origin: 'planner' };
        input.setTaskLinks((prev) => [...prev, plannerLink]);
        savePlannerLinkOnly(plannerLink).catch((err) =>
          console.error('Error saving planner link:', err)
        );
        return;
      }

      const fromKey = resolveTrackerIssueKey(
        link.fromTaskId,
        input.tasksMap,
        input.allTasksForDrag
      );
      const toKey = resolveTrackerIssueKey(link.toTaskId, input.tasksMap, input.allTasksForDrag);
      if (!fromKey || !toKey || fromKey === toKey) {
        return;
      }

      const optimistic: TaskLink = {
        ...link,
        origin: 'tracker',
        relationship: 'relates',
      };
      setOptimisticTrackerLinks((prev) => [...prev, optimistic]);
      void persistNewTrackerIssueLink({
        fromKey,
        invalidateTrackerIssueLinks,
        optimisticId: optimistic.id,
        setOptimisticTrackerLinks,
        toKey,
      });
    },
    [input, invalidateTrackerIssueLinks, savePlannerLinkOnly]
  );

  const deleteTrackerOverlayLink = useCallback(
    async (link: { fromTaskId: string; id: string; toTaskId: string }) => {
      const trackerLinkId = parseTrackerOverlayLinkId(link.id);
      if (!trackerLinkId) {
        return;
      }
      const fromKey = resolveTrackerIssueKey(
        link.fromTaskId,
        input.tasksMap,
        input.allTasksForDrag
      );
      if (!fromKey) {
        return;
      }
      setOptimisticTrackerLinks((prev) => prev.filter((item) => item.id !== link.id));
      await deleteIssueLink(fromKey, trackerLinkId);
      invalidateTrackerIssueLinks();
    },
    [input.allTasksForDrag, input.tasksMap, invalidateTrackerIssueLinks]
  );

  return {
    deleteTrackerOverlayLink,
    handleAddLink,
    savePlannerLinkOnly,
    trackerTaskLinks,
  };
}

async function persistNewTrackerIssueLink(input: {
  fromKey: string;
  invalidateTrackerIssueLinks: () => void;
  optimisticId: string;
  setOptimisticTrackerLinks: Dispatch<SetStateAction<TaskLink[]>>;
  toKey: string;
}): Promise<void> {
  try {
    const created = await createIssueLink(input.fromKey, {
      targetIssueKey: input.toKey,
      relationship: 'relates',
    });
    const overlayId = created.id
      ? toTrackerOverlayLinkId(created.id)
      : input.optimisticId;
    input.setOptimisticTrackerLinks((prev) =>
      prev.map((item) =>
        item.id === input.optimisticId
          ? {
              ...item,
              id: overlayId,
              relationship: created.relationship,
            }
          : item
      )
    );
    input.invalidateTrackerIssueLinks();
  } catch (err) {
    console.error('Error creating tracker issue link:', err);
    input.setOptimisticTrackerLinks((prev) =>
      prev.filter((item) => item.id !== input.optimisticId)
    );
  }
}
