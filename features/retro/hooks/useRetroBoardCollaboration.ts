'use client';

import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useSprintCardPresenceReporter } from '@/hooks/useSprintCardPresenceReporter';
import { useSprintRealtimeSync } from '@/hooks/useSprintRealtimeSync';

import { isRetroSaveInflight } from './retroBoardSyncState';

function retroBoardQueryKey(sprintId: number): ['retroBoard', number] {
  return ['retroBoard', sprintId];
}

export function useRetroBoardCollaboration(
  sprintId: number | null,
  previousSprintId: number | null
): SprintPresenceViewer[] {
  const queryClient = useQueryClient();
  const [viewers, setViewers] = useState<SprintPresenceViewer[]>([]);

  const refresh = (id: number) => {
    if (isRetroSaveInflight(id)) return;
    queryClient.invalidateQueries({ queryKey: retroBoardQueryKey(id) }).catch(() => undefined);
  };

  useSprintRealtimeSync(sprintId, {
    onPresence: setViewers,
    onRetro: () => {
      if (sprintId) refresh(sprintId);
    },
  });
  useSprintRealtimeSync(
    previousSprintId,
    {
      onRetro: () => {
        if (previousSprintId) refresh(previousSprintId);
      },
    },
    { presence: false }
  );
  useSprintCardPresenceReporter({
    boardView: 'retro',
    contextMenuTaskId: null,
    draggingTaskId: null,
    editingTaskId: null,
    gesture: null,
    hoveredTaskId: null,
    linkingTaskId: null,
    resizingTaskId: null,
    sprintId,
  });

  return viewers;
}
