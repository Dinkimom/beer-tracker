'use client';

import { observer } from 'mobx-react-lite';

import { useRootStore } from '@/lib/layers';

/**
 * Подписка MobX на дерево планера (`observer`).
 * `data-planner-mobx-session` — для e2e и отладки; визуально скрыто.
 */
export const PlannerMobxSessionBridge = observer(function PlannerMobxSessionBridge() {
  const { sprintPlannerUi } = useRootStore();
  return (
    <span className="sr-only" data-planner-mobx-session={sprintPlannerUi.sessionId} />
  );
});
