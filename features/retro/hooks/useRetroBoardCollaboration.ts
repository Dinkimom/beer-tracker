'use client';

import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useSprintCardPresenceReporter } from '@/hooks/useSprintCardPresenceReporter';
import { useSprintRealtimeSync } from '@/hooks/useSprintRealtimeSync';

import { retroBoardQueryKey } from './useRetroBoard';


export function useRetroBoardCollaboration(
  sprintId: number | null,
  previousSprintId: number | null
): SprintPresenceViewer[] {
  const queryClient = useQueryClient();
  const [viewers, setViewers] = useState<SprintPresenceViewer[]>([]);

  // Ответ склеивается с несохранёнными правками (`loadSyncedRetroBoard`), поэтому событие во время
  // своего сохранения не пропускается: иначе чужая правка не видна до следующего события.
  const refresh = (id: number) => {
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
