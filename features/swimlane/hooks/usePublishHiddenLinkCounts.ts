import { useEffect, useRef } from 'react';

import { useRootStore } from '@/lib/layers';

/**
 * Отдаёт счётчики скрытых в покое связей в SprintPlannerUiStore: значок рисует сама карточка
 * (правая рейка), поэтому он не отстаёт от карточки при drag/resize и не спорит с её кнопками.
 */
export function usePublishHiddenLinkCounts(counts: Map<string, number>, enabled: boolean): void {
  const { sprintPlannerUi } = useRootStore();
  const countsRef = useRef(counts);
  /** `counts` пересобирается каждый рендер — публикуем только при смене содержимого. */
  const countsKey = Array.from(counts, ([id, count]) => `${id}:${count}`).join('|');

  useEffect(() => {
    countsRef.current = counts;
  });

  useEffect(() => {
    if (!enabled) return;
    sprintPlannerUi.setHiddenLinkCounts(countsRef.current);
  }, [countsKey, enabled, sprintPlannerUi]);

  useEffect(() => {
    if (!enabled) return;
    return () => sprintPlannerUi.setHiddenLinkCounts(new Map());
  }, [enabled, sprintPlannerUi]);
}
