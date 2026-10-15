'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';

import { SwimlaneSidebarDropPointerStore } from '@/lib/layers/application/swimlaneDrag';

const IDLE_POINTER_STORE = new SwimlaneSidebarDropPointerStore();

export const SwimlaneSidebarDropPointerContext =
  createContext<SwimlaneSidebarDropPointerStore>(IDLE_POINTER_STORE);

const noopSubscribe = () => () => {};

/**
 * Y курсора над сайдбаром (rAF-стор). Без подписки планер не ререндерится на move.
 */
export function useSidebarDropPointerY(enabled = true): number | null {
  const store = useContext(SwimlaneSidebarDropPointerContext);
  const getSnapshot = () => (enabled ? store.getSnapshot() : null);
  return useSyncExternalStore(enabled ? store.subscribe : noopSubscribe, getSnapshot, getSnapshot);
}
