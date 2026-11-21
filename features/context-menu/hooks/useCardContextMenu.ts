import type { CardContextMenuState } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

import { comparer, computed } from 'mobx';
import { useMemo } from 'react';

import { useRootStore } from '@/lib/layers';

/**
 * Контекстное меню глазами одной карточки (дорожка, канбан, сайдбар). Флаги — `computed` со
 * структурным сравнением: компонент-observer перерисуется, только когда меню открылось или
 * закрылось на нём самом либо началось или кончилось приглушение. Правило — в сторе.
 */
export function useCardContextMenu(taskId: string): CardContextMenuState {
  const { sprintPlannerUi } = useRootStore();
  return useMemo(
    () =>
      computed(() => sprintPlannerUi.cardContextMenuState(taskId), { equals: comparer.structural }),
    [sprintPlannerUi, taskId]
  ).get();
}
