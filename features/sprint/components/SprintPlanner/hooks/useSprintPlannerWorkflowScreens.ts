import { useEffect, useState, startTransition } from 'react';

import { fetchQueueWorkflowScreens, type TransitionField } from '@/lib/beerTrackerApi';

/**
 * Экраны переходов workflow по очереди доски (для модалки при смене статуса в планировщике).
 */
export function useSprintPlannerWorkflowScreens(
  selectedBoardId: number | null,
  getQueueByBoardId: (boardId: number | null) => string | null | undefined
): Record<string, Record<string, TransitionField[]>> {
  const [workflowScreens, setWorkflowScreens] = useState<
    Record<string, Record<string, TransitionField[]>>
  >({});

  useEffect(() => {
    const queueKey = getQueueByBoardId(selectedBoardId ?? null);
    if (!queueKey) {
      startTransition(() => setWorkflowScreens({}));
      return;
    }
    let cancelled = false;
    fetchQueueWorkflowScreens(queueKey)
      .then((data) => {
        if (!cancelled) setWorkflowScreens(data);
      })
      .catch(() => {
        if (!cancelled) setWorkflowScreens({});
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBoardId, getQueueByBoardId]);

  return workflowScreens;
}
