'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/** API регистрации видимости якорей — ссылка на value стабильна, строки не ререндерятся при скролле. */
interface OccupancyArrowsRegisterCtxValue {
  registerVisible: (taskIds: string[], inView: boolean) => void;
}

/** Снимок видимых taskId — меняется при скролле; подписываться только там, где нужен (стрелки). */
interface OccupancyArrowsVisibleIdsCtxValue {
  visibleTaskIds: Set<string>;
}

const OccupancyArrowsRegisterCtx = createContext<OccupancyArrowsRegisterCtxValue | null>(null);

const OccupancyArrowsVisibleIdsCtx = createContext<OccupancyArrowsVisibleIdsCtxValue | null>(null);

export function useOccupancyArrowsRegister(): OccupancyArrowsRegisterCtxValue | null {
  return useContext(OccupancyArrowsRegisterCtx);
}

export function useOccupancyArrowsVisibleIds(): OccupancyArrowsVisibleIdsCtxValue | null {
  return useContext(OccupancyArrowsVisibleIdsCtx);
}

export function OccupancyArrowsVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [visibleTaskIds, setVisibleTaskIds] = useState<Set<string>>(() => new Set());

  const registerVisible = useCallback((taskIds: string[], inView: boolean) => {
    setVisibleTaskIds((prev) => {
      const next = new Set(prev);
      for (const id of taskIds) {
        if (inView) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const registerValue = useMemo<OccupancyArrowsRegisterCtxValue>(
    () => ({ registerVisible }),
    [registerVisible]
  );

  const visibleIdsValue = useMemo<OccupancyArrowsVisibleIdsCtxValue>(
    () => ({ visibleTaskIds }),
    [visibleTaskIds]
  );

  return (
    <OccupancyArrowsRegisterCtx.Provider value={registerValue}>
      <OccupancyArrowsVisibleIdsCtx.Provider value={visibleIdsValue}>
        {children}
      </OccupancyArrowsVisibleIdsCtx.Provider>
    </OccupancyArrowsRegisterCtx.Provider>
  );
}

