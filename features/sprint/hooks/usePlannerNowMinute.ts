'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let minute = Math.floor(Date.now() / 60_000);

function emitPlannerMinute() {
  minute = Math.floor(Date.now() / 60_000);
  listeners.forEach((listener) => listener());
}

function subscribePlannerMinute(listener: () => void) {
  listeners.add(listener);
  if (timer == null) {
    timer = setInterval(emitPlannerMinute, 60_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getPlannerMinuteSnapshot() {
  return minute;
}

/** Минута unix-времени. Обновляется раз в минуту, одна подписка на всех слушателей. */
export function usePlannerNowMinute(): number {
  return useSyncExternalStore(
    subscribePlannerMinute,
    getPlannerMinuteSnapshot,
    getPlannerMinuteSnapshot
  );
}

export function plannerNowFromMinute(minuteStamp: number): Date {
  return new Date(minuteStamp * 60_000);
}
