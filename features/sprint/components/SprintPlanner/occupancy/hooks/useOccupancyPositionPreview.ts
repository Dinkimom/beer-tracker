import type { PositionPreview } from '../components/task-row/plan/OccupancyPhaseBar';
import type { TaskPosition } from '@/types';

import { startTransition, useCallback, useEffect, useState } from 'react';

import { useSprintBoardPresenceViewers } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { useRootStore } from '@/lib/layers';
import { remotePresenceOccupancyPreviews } from '@/lib/realtime/sprintPresenceGesture';
import {
  presenceOccupancyPreviewMapsEqual,
  retainPresenceOccupancyPreviews,
} from '@/lib/realtime/sprintPresenceGestureRetain';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';

import { applyOccupancyPositionPreviewUpdate, pruneStalePositionPreviews } from './useOccupancyPositionPreviewHelpers';

export function useOccupancyPositionPreview(taskPositions: Map<string, TaskPosition>) {
  const { sprintPlannerUi } = useRootStore();
  const [positionPreviews, setPositionPreviews] = useState<Map<string, PositionPreview>>(
    new Map()
  );
  const [latchedRemotePreviews, setLatchedRemotePreviews] = useState(
    () => new Map<string, PositionPreview>()
  );

  const handlePositionPreview = useCallback((
    taskId: string,
    preview: PositionPreview | null,
    options?: { discard?: boolean }
  ) => {
    sprintPlannerUi.setOccupancyPresencePreview(
      preview
        ? {
            duration: preview.duration,
            startDay: preview.startDay,
            startPart: preview.startPart,
            taskId,
          }
        : null
    );
    setPositionPreviews((prev) =>
      applyOccupancyPositionPreviewUpdate(prev, taskId, preview, options)
    );
  }, [sprintPlannerUi]);

  useEffect(() => {
    startTransition(() => {
      setPositionPreviews((prev) => pruneStalePositionPreviews(prev, taskPositions));
    });
  }, [taskPositions]);

  const boardViewers = useSprintBoardPresenceViewers();
  const remotePreviews = retainPresenceOccupancyPreviews(
    remotePresenceOccupancyPreviews(boardViewers, getBrowserRealtimeClientId() || null),
    latchedRemotePreviews,
    taskPositions
  );
  if (!presenceOccupancyPreviewMapsEqual(remotePreviews, latchedRemotePreviews)) {
    setLatchedRemotePreviews(remotePreviews);
  }
  if (remotePreviews.size === 0) {
    return {
      positionPreviews,
      handlePositionPreview,
    };
  }
  const mergedPreviews = new Map(positionPreviews);
  for (const [taskId, preview] of remotePreviews) {
    if (!mergedPreviews.has(taskId)) {
      mergedPreviews.set(taskId, preview);
    }
  }

  return {
    positionPreviews: mergedPreviews,
    handlePositionPreview,
  };
}
