'use client';

import { useEffect, useState } from 'react';

import { fetchSprintComments, fetchSprintLinks } from '@/lib/beerTrackerApi';
import {
  isSprintBoardListPrefetchSettled,
  prefetchSprintBoardList,
} from '@/lib/sprints/sprintBoardListPrefetch';

import { ensureFeatureLanesSessionLoaded } from './featureLanesSessionStore';

function isSprintBoardListsPrefetchReady(sprintId: number): boolean {
  return (
    isSprintBoardListPrefetchSettled(sprintId, 'comments') &&
    isSprintBoardListPrefetchSettled(sprintId, 'links')
  );
}

/**
 * Готовность списков доски (комментарии и связи) для вкладки «Доска».
 * Комментарии и связи префетчатся в фоне; полноэкранный лоадер их не ждёт.
 */
export function useSprintBoardListsGateReady(sprintId: number | null | undefined): boolean {
  const [ready, setReady] = useState(() =>
    sprintId == null ? true : isSprintBoardListsPrefetchReady(sprintId)
  );

  useEffect(() => {
    if (sprintId == null) {
      queueMicrotask(() => setReady(true));
      return;
    }

    ensureFeatureLanesSessionLoaded(sprintId);

    if (isSprintBoardListsPrefetchReady(sprintId)) {
      queueMicrotask(() => setReady(true));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setReady(false));

    Promise.all([
      prefetchSprintBoardList(sprintId, 'comments', fetchSprintComments),
      prefetchSprintBoardList(sprintId, 'links', fetchSprintLinks),
    ])
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((error) => {
        console.error('Error prefetching sprint board lists:', error);
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sprintId]);

  return ready;
}
